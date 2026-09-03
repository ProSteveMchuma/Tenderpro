"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth, requirePermission } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db/client";
import { logActivity, nextNumber, notify } from "@/lib/data/workspace";
import { storeFile } from "@/lib/storage/files";
import { extractTextFromBuffer } from "@/lib/documents/extract";
import { runAiCapability } from "@/lib/ai/run";
import { calculateDueDate, combineLocalDateTime } from "@/lib/dates";
import { addMoney, moneyString, percentOf, subtractMoney } from "@/lib/money";
import { applyPaymentToInvoice, canInvoicePurchaseOrder, invoiceOutstanding } from "@/lib/domain/invoice";
import { calculateTenderReadiness, matchRequirementToVault } from "@/lib/domain/tender-readiness";
import { scoreQuotations } from "@/lib/domain/quotation-score";
import { assertEntitlement } from "@/lib/entitlements";
import { analyzeTenderSchema } from "@/lib/ai/schemas";

function fd(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

async function refresh(paths: string[]) {
  for (const path of paths) revalidatePath(path);
}

export async function createCustomerAction(formData: FormData) {
  const ctx = await requirePermission("customers.write");
  const count = await queryOne<{ count: number }>(
    "select count(*)::int as count from customers where organization_id = $1 and deleted_at is null",
    [ctx.membership.organizationId],
  );
  assertEntitlement(ctx.membership.planId, "clients", count?.count ?? 0);
  const id = crypto.randomUUID();
  await query(
    `insert into customers (id, organization_id, name, type, industry, tax_pin, payment_terms_days, default_currency, address, phone, email, notes)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      id,
      ctx.membership.organizationId,
      fd(formData, "name"),
      fd(formData, "type") || "corporate",
      fd(formData, "industry"),
      fd(formData, "taxPin"),
      Number(fd(formData, "paymentTermsDays") || 30),
      fd(formData, "currency") || ctx.membership.currency,
      fd(formData, "address"),
      fd(formData, "phone"),
      fd(formData, "email"),
      fd(formData, "notes"),
    ],
  );
  await logActivity(ctx, { entityType: "customer", entityId: id, action: "created", summary: `${ctx.user.fullName} added customer ${fd(formData, "name")}.` });
  await refresh(["/app/customers"]);
  redirect(`/app/customers/${id}`);
}

export async function createOpportunityAction(formData: FormData) {
  const ctx = await requirePermission("opportunities.write");
  const id = crypto.randomUUID();
  await query(
    `insert into opportunities (id, organization_id, customer_id, title, estimated_value, probability, expected_close_date, source, owner_id, stage, notes)
     values ($1,$2,nullif($3,'')::uuid,$4,$5,$6,nullif($7,''),$8,$9,$10,$11)`,
    [
      id,
      ctx.membership.organizationId,
      fd(formData, "customerId"),
      fd(formData, "title"),
      moneyString(fd(formData, "estimatedValue") || "0"),
      Number(fd(formData, "probability") || 10),
      fd(formData, "expectedCloseDate"),
      fd(formData, "source"),
      ctx.user.id,
      fd(formData, "stage") || "identified",
      fd(formData, "notes"),
    ],
  );
  await logActivity(ctx, { entityType: "opportunity", entityId: id, action: "created", summary: `${ctx.user.fullName} created opportunity ${fd(formData, "title")}.` });
  await refresh(["/app/opportunities"]);
  redirect("/app/opportunities");
}

export async function updateOpportunityStageAction(formData: FormData) {
  const ctx = await requirePermission("opportunities.write");
  await query(
    `update opportunities set stage = $1, updated_at = now()
     where id = $2 and organization_id = $3`,
    [fd(formData, "stage"), fd(formData, "id"), ctx.membership.organizationId],
  );
  await refresh(["/app/opportunities"]);
}

export async function createTenderAction(formData: FormData) {
  const ctx = await requirePermission("tenders.write");
  const active = await queryOne<{ count: number }>(
    `select count(*)::int as count from tenders where organization_id = $1 and deleted_at is null and status not in ('lost','cancelled')`,
    [ctx.membership.organizationId],
  );
  assertEntitlement(ctx.membership.planId, "activeTenders", active?.count ?? 0);
  const closingDate = fd(formData, "closingDate") || null;
  const closingTime = fd(formData, "closingTime") || "10:00";
  const timezone = ctx.membership.timezone;
  const closingAt = closingDate ? combineLocalDateTime(closingDate, closingTime, timezone) : null;
  const id = crypto.randomUUID();
  await query(
    `insert into tenders (id, organization_id, customer_id, title, reference, procuring_entity, category, closing_date, closing_time, timezone, closing_at, submission_method, submission_location, tender_value, currency, tender_security_amount, tender_validity_period, status, assigned_to)
     values ($1,$2,nullif($3,'')::uuid,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,nullif($14,'')::numeric,$15,nullif($16,'')::numeric,$17,$18,$19)`,
    [
      id,
      ctx.membership.organizationId,
      fd(formData, "customerId"),
      fd(formData, "title"),
      fd(formData, "reference"),
      fd(formData, "procuringEntity"),
      fd(formData, "category"),
      closingDate,
      closingTime,
      timezone,
      closingAt?.toISOString() ?? null,
      fd(formData, "submissionMethod"),
      fd(formData, "submissionLocation"),
      fd(formData, "tenderValue"),
      fd(formData, "currency") || ctx.membership.currency,
      fd(formData, "tenderSecurityAmount"),
      fd(formData, "tenderValidityPeriod"),
      fd(formData, "status") || "draft",
      ctx.user.id,
    ],
  );
  await logActivity(ctx, { entityType: "tender", entityId: id, action: "created", summary: `${ctx.user.fullName} created tender ${fd(formData, "reference") || fd(formData, "title")}.` });
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    await analyzeTenderDocument(ctx, id, file);
  }
  await refresh(["/app/tenders", `/app/tenders/${id}`]);
  redirect(`/app/tenders/${id}`);
}

async function analyzeTenderDocument(
  ctx: Awaited<ReturnType<typeof requireAuth>>,
  tenderId: string,
  file: File,
) {
  const usage = await queryOne<{ ai_analyses: number }>(
    `insert into usage_counters (id, organization_id, period, ai_analyses)
     values (gen_random_uuid(),$1,to_char(now(),'YYYY-MM'),1)
     on conflict (organization_id, period) do update set ai_analyses = usage_counters.ai_analyses + 1
     returning ai_analyses`,
    [ctx.membership.organizationId],
  );
  assertEntitlement(ctx.membership.planId, "aiAnalysesPerMonth", (usage?.ai_analyses ?? 1) - 1);
  const stored = await storeFile({ organizationId: ctx.membership.organizationId, userId: ctx.user.id, file });
  const text = await extractTextFromBuffer(stored.buffer, stored.mime, stored.name);
  await query(
    `insert into tender_documents (id, organization_id, tender_id, file_id, kind, extracted_text)
     values (gen_random_uuid(),$1,$2,$3,'source',$4)`,
    [ctx.membership.organizationId, tenderId, stored.id, text],
  );
  const ai = await runAiCapability("analyzeTender", text || file.name);
  if (!ai.ok) {
    await query(
      `insert into ai_jobs (id, organization_id, capability, status, entity_type, entity_id, error, created_by)
       values (gen_random_uuid(),$1,'analyzeTender','failed','tender',$2,$3,$4)`,
      [ctx.membership.organizationId, tenderId, ai.error, ctx.user.id],
    );
    return;
  }
  const parsed = analyzeTenderSchema.parse(ai.data);
  await query(
    `update tenders set
      title = coalesce(nullif($1,''), title),
      reference = coalesce(nullif($2,''), reference),
      procuring_entity = coalesce(nullif($3,''), procuring_entity),
      category = coalesce(nullif($4,''), category),
      closing_date = coalesce($5::date, closing_date),
      closing_time = coalesce(nullif($6,''), closing_time),
      submission_method = coalesce(nullif($7,''), submission_method),
      submission_location = coalesce(nullif($8,''), submission_location),
      tender_value = coalesce($9::numeric, tender_value),
      tender_security_amount = coalesce($10::numeric, tender_security_amount),
      tender_validity_period = coalesce(nullif($11,''), tender_validity_period),
      analysis = $12::jsonb,
      updated_at = now()
     where id = $13 and organization_id = $14`,
    [
      parsed.title,
      parsed.reference,
      parsed.procuringEntity,
      parsed.category,
      parsed.closingDate,
      parsed.closingTime,
      parsed.submissionMethod,
      parsed.submissionLocation,
      parsed.tenderValue,
      parsed.tenderSecurityAmount,
      parsed.tenderValidityPeriod,
      JSON.stringify(parsed),
      tenderId,
      ctx.membership.organizationId,
    ],
  );
  const vault = await query<{
    id: string;
    name: string;
    category: string;
    tags: unknown;
    expiry_date: string | null;
    coverage_year: number | null;
  }>(
    `select id, name, category, tags, expiry_date::text, coverage_year from company_documents
     where organization_id = $1 and deleted_at is null`,
    [ctx.membership.organizationId],
  );
  const vaultDocs = vault.map((doc) => ({
    id: doc.id,
    name: doc.name,
    category: doc.category,
    tags: Array.isArray(doc.tags) ? (doc.tags as string[]) : [],
    expiryDate: doc.expiry_date,
    coverageYear: doc.coverage_year,
  }));
  await query("delete from tender_requirements where tender_id = $1 and organization_id = $2", [
    tenderId,
    ctx.membership.organizationId,
  ]);
  for (const requirement of parsed.requirements) {
    const match = matchRequirementToVault(requirement.text, vaultDocs);
    await query(
      `insert into tender_requirements (id, organization_id, tender_id, requirement_text, category, source_document, page_number, mandatory, status, evidence_document_id, match_reason, confidence)
       values (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        ctx.membership.organizationId,
        tenderId,
        requirement.text,
        requirement.category,
        requirement.source ?? "Uploaded tender",
        requirement.pageNumber ?? null,
        requirement.mandatory,
        match.status,
        match.evidenceDocumentId,
        match.reason,
        match.confidence,
      ],
    );
  }
  const reqs = await query<{ category: string; mandatory: boolean; status: string }>(
    "select category, mandatory, status from tender_requirements where tender_id = $1",
    [tenderId],
  );
  const readiness = calculateTenderReadiness(reqs);
  await query("update tenders set readiness_percent = $1 where id = $2", [readiness.percent, tenderId]);
  await query(
    `insert into ai_jobs (id, organization_id, capability, status, entity_type, entity_id, output, confidence, created_by, completed_at)
     values (gen_random_uuid(),$1,'analyzeTender','complete','tender',$2,$3::jsonb,$4,$5,now())`,
    [ctx.membership.organizationId, tenderId, JSON.stringify(parsed), ai.confidence, ctx.user.id],
  );
}

export async function rerunTenderAnalysisAction(formData: FormData) {
  const ctx = await requirePermission("tenders.write");
  const tenderId = fd(formData, "tenderId");
  const doc = await queryOne<{ extracted_text: string }>(
    `select extracted_text from tender_documents where tender_id = $1 and organization_id = $2 order by created_at desc limit 1`,
    [tenderId, ctx.membership.organizationId],
  );
  if (!doc?.extracted_text) throw new Error("No extracted tender text is available.");
  const fakeFile = new File([doc.extracted_text], "tender.txt", { type: "text/plain" });
  await analyzeTenderDocument(ctx, tenderId, fakeFile);
  await refresh([`/app/tenders/${tenderId}`]);
}

export async function runBidAuditAction(formData: FormData) {
  const ctx = await requirePermission("tenders.write");
  const tenderId = fd(formData, "tenderId");
  const tender = await queryOne(
    `select t.*, coalesce(json_agg(r.*) filter (where r.id is not null), '[]') as requirements
     from tenders t
     left join tender_requirements r on r.tender_id = t.id
     where t.id = $1 and t.organization_id = $2
     group by t.id`,
    [tenderId, ctx.membership.organizationId],
  );
  const ai = await runAiCapability("runBidAudit", JSON.stringify(tender));
  await query(
    `insert into ai_jobs (id, organization_id, capability, status, entity_type, entity_id, output, error, confidence, created_by, completed_at)
     values (gen_random_uuid(),$1,'runBidAudit',$2,'tender',$3,$4::jsonb,$5,$6,$7,now())`,
    [
      ctx.membership.organizationId,
      ai.ok ? "complete" : "failed",
      tenderId,
      ai.ok ? JSON.stringify(ai.data) : null,
      ai.ok ? null : ai.error,
      ai.ok ? ai.confidence : "failed",
      ctx.user.id,
    ],
  );
  await refresh([`/app/tenders/${tenderId}`]);
}

export async function uploadVaultDocumentAction(formData: FormData) {
  const ctx = await requirePermission("vault.write");
  const file = formData.get("file");
  let fileId: string | null = null;
  let meta = {
    documentName: fd(formData, "name"),
    category: fd(formData, "category") || "other",
    documentNumber: fd(formData, "documentNumber"),
    issuingAuthority: fd(formData, "issuingAuthority"),
    issueDate: fd(formData, "issueDate"),
    expiryDate: fd(formData, "expiryDate"),
    tags: fd(formData, "tags"),
  };
  if (file instanceof File && file.size > 0) {
    const stored = await storeFile({ organizationId: ctx.membership.organizationId, userId: ctx.user.id, file });
    fileId = stored.id;
    const text = await extractTextFromBuffer(stored.buffer, stored.mime, stored.name);
    const ai = await runAiCapability("extractDocumentMetadata", text || stored.name);
    if (ai.ok && ai.data && typeof ai.data === "object") {
      const data = ai.data as Record<string, string | string[] | null>;
      meta = {
        documentName: meta.documentName || String(data.documentName || stored.name),
        category: meta.category !== "other" ? meta.category : String(data.category || "other"),
        documentNumber: meta.documentNumber || String(data.documentNumber || ""),
        issuingAuthority: meta.issuingAuthority || String(data.issuingAuthority || ""),
        issueDate: meta.issueDate || String(data.issueDate || ""),
        expiryDate: meta.expiryDate || String(data.expiryDate || ""),
        tags: meta.tags || (Array.isArray(data.tags) ? data.tags.join(",") : ""),
      };
    }
  }
  const id = crypto.randomUUID();
  await query(
    `insert into company_documents (id, organization_id, file_id, name, category, document_number, issuing_authority, issue_date, expiry_date, country, tags, notes)
     values ($1,$2,$3,$4,$5,$6,$7,nullif($8,''),nullif($9,''),$10,$11::jsonb,$12)`,
    [
      id,
      ctx.membership.organizationId,
      fileId,
      meta.documentName || "Untitled document",
      meta.category,
      meta.documentNumber,
      meta.issuingAuthority,
      meta.issueDate,
      meta.expiryDate,
      ctx.membership.country,
      JSON.stringify(meta.tags ? meta.tags.split(",").map((item) => item.trim()) : []),
      fd(formData, "notes"),
    ],
  );
  await logActivity(ctx, { entityType: "company_document", entityId: id, action: "uploaded", summary: `${ctx.user.fullName} uploaded ${meta.documentName}.` });
  await refresh(["/app/vault"]);
  redirect("/app/vault");
}

export async function createPurchaseOrderAction(formData: FormData) {
  const ctx = await requirePermission("purchase_orders.write");
  const file = formData.get("file");
  let extracted: Record<string, unknown> | null = null;
  let fileId: string | null = null;
  if (file instanceof File && file.size > 0) {
    const stored = await storeFile({ organizationId: ctx.membership.organizationId, userId: ctx.user.id, file });
    fileId = stored.id;
    const text = await extractTextFromBuffer(stored.buffer, stored.mime, stored.name);
    const ai = await runAiCapability("extractPurchaseOrder", text || stored.name);
    if (ai.ok) extracted = ai.data as Record<string, unknown>;
  }
  const number =
    fd(formData, "number") ||
    String(extracted?.poNumber || "") ||
    (await nextNumber(ctx.membership.organizationId, "po", "PO"));
  const id = crypto.randomUUID();
  const total = moneyString(fd(formData, "total") || String(extracted?.total || "0"));
  const tax = moneyString(fd(formData, "tax") || String(extracted?.tax || "0"));
  const subtotal = moneyString(fd(formData, "subtotal") || String(extracted?.subtotal || subtractMoney(total, tax)));
  await query(
    `insert into purchase_orders (id, organization_id, customer_id, number, issue_date, currency, payment_terms_days, payment_terms_text, delivery_location, delivery_deadline, contact_person, special_conditions, subtotal, tax, total, status, requires_grn, file_id, extraction)
     values ($1,$2,nullif($3,'')::uuid,$4,nullif($5,'')::date,$6,$7,$8,$9,nullif($10,'')::date,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb)`,
    [
      id,
      ctx.membership.organizationId,
      fd(formData, "customerId"),
      number,
      fd(formData, "issueDate") || String(extracted?.issueDate || ""),
      fd(formData, "currency") || String(extracted?.currency || ctx.membership.currency),
      Number(fd(formData, "paymentTermsDays") || 30),
      fd(formData, "paymentTermsText") || String(extracted?.paymentTerms || ""),
      fd(formData, "deliveryLocation") || String(extracted?.deliveryLocation || ""),
      fd(formData, "deliveryDeadline") || String(extracted?.deliveryDeadline || ""),
      fd(formData, "contactPerson") || String(extracted?.contactPerson || ""),
      fd(formData, "specialConditions") || String(extracted?.specialConditions || ""),
      subtotal,
      tax,
      total,
      fd(formData, "status") || "received",
      formData.get("requiresGrn") !== "false",
      fileId,
      extracted ? JSON.stringify(extracted) : null,
    ],
  );
  const items = Array.isArray(extracted?.lineItems) ? extracted.lineItems as Array<Record<string, string>> : [];
  for (const item of items) {
    await query(
      `insert into purchase_order_items (id, organization_id, purchase_order_id, description, quantity, unit_price, tax, total)
       values (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7)`,
      [ctx.membership.organizationId, id, item.description, item.quantity, item.unitPrice, item.tax || "0", item.total],
    );
  }
  await logActivity(ctx, { entityType: "purchase_order", entityId: id, action: "created", summary: `${ctx.user.fullName} created ${number}.` });
  await refresh(["/app/purchase-orders"]);
  redirect(`/app/purchase-orders/${id}`);
}

export async function createDeliveryAction(formData: FormData) {
  const ctx = await requirePermission("deliveries.write");
  const id = crypto.randomUUID();
  const number = fd(formData, "number") || (await nextNumber(ctx.membership.organizationId, "dn", "DN"));
  await query(
    `insert into deliveries (id, organization_id, customer_id, purchase_order_id, number, delivery_date, location, delivered_by, received_by, status, notes)
     values ($1,$2,nullif($3,'')::uuid,nullif($4,'')::uuid,$5,nullif($6,'')::date,$7,$8,$9,$10,$11)`,
    [
      id,
      ctx.membership.organizationId,
      fd(formData, "customerId"),
      fd(formData, "purchaseOrderId"),
      number,
      fd(formData, "deliveryDate"),
      fd(formData, "location"),
      fd(formData, "deliveredBy"),
      fd(formData, "receivedBy"),
      fd(formData, "status") || "scheduled",
      fd(formData, "notes"),
    ],
  );
  if (fd(formData, "purchaseOrderId") && fd(formData, "status") === "delivered") {
    await query(
      `update purchase_orders set status = 'awaiting_grn', updated_at = now()
       where id = $1 and organization_id = $2`,
      [fd(formData, "purchaseOrderId"), ctx.membership.organizationId],
    );
  }
  await logActivity(ctx, { entityType: "delivery", entityId: id, action: "created", summary: `${ctx.user.fullName} recorded delivery ${number}.` });
  await refresh(["/app/deliveries"]);
  redirect("/app/deliveries");
}

export async function createGrnAction(formData: FormData) {
  const ctx = await requirePermission("grns.write");
  const id = crypto.randomUUID();
  const number = fd(formData, "number") || (await nextNumber(ctx.membership.organizationId, "grn", "GRN"));
  let fileId: string | null = null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    fileId = (await storeFile({ organizationId: ctx.membership.organizationId, userId: ctx.user.id, file })).id;
  }
  await query(
    `insert into goods_receipts (id, organization_id, customer_id, purchase_order_id, delivery_id, number, grn_date, status, file_id, notes)
     values ($1,$2,nullif($3,'')::uuid,nullif($4,'')::uuid,nullif($5,'')::uuid,$6,nullif($7,'')::date,$8,$9,$10)`,
    [
      id,
      ctx.membership.organizationId,
      fd(formData, "customerId"),
      fd(formData, "purchaseOrderId"),
      fd(formData, "deliveryId"),
      number,
      fd(formData, "grnDate"),
      fd(formData, "status") || "signed",
      fileId,
      fd(formData, "notes"),
    ],
  );
  if (fd(formData, "purchaseOrderId")) {
    await query(
      `update purchase_orders set status = 'ready_to_invoice', updated_at = now()
       where id = $1 and organization_id = $2`,
      [fd(formData, "purchaseOrderId"), ctx.membership.organizationId],
    );
  }
  await logActivity(ctx, { entityType: "grn", entityId: id, action: "created", summary: `${ctx.user.fullName} recorded ${number}.` });
  await refresh(["/app/grns", "/app/purchase-orders"]);
  redirect("/app/grns");
}

export async function createInvoiceAction(formData: FormData) {
  const ctx = await requirePermission("invoices.write");
  const poId = fd(formData, "purchaseOrderId");
  if (poId) {
    const po = await queryOne<{ requires_grn: boolean; status: string }>(
      "select requires_grn, status from purchase_orders where id = $1 and organization_id = $2",
      [poId, ctx.membership.organizationId],
    );
    const grn = await queryOne(
      `select id from goods_receipts where purchase_order_id = $1 and organization_id = $2 and deleted_at is null and status in ('signed','complete')`,
      [poId, ctx.membership.organizationId],
    );
    const gate = canInvoicePurchaseOrder({ requiresGrn: Boolean(po?.requires_grn), hasSignedGrn: Boolean(grn) });
    if (!gate.allowed) throw new Error(gate.warning || "Invoice blocked");
  }
  const issueDate = fd(formData, "issueDate") || new Date().toISOString().slice(0, 10);
  const terms = Number(fd(formData, "paymentTermsDays") || 30);
  const dueDate = fd(formData, "dueDate") || calculateDueDate(issueDate, terms);
  const subtotal = moneyString(fd(formData, "subtotal") || "0");
  const vat = fd(formData, "vat") ? moneyString(fd(formData, "vat")) : percentOf(subtotal, ctx.membership.vatRate);
  const total = fd(formData, "total") ? moneyString(fd(formData, "total")) : addMoney(subtotal, vat);
  const withholding = moneyString(fd(formData, "withholdingTax") || "0");
  const deductions = moneyString(fd(formData, "otherDeductions") || "0");
  const outstanding = invoiceOutstanding({ total, withholdingTax: withholding, otherDeductions: deductions, paidAmount: "0" });
  const number = fd(formData, "number") || (await nextNumber(ctx.membership.organizationId, "inv", "INV"));
  const id = crypto.randomUUID();
  await query(
    `insert into invoices (id, organization_id, customer_id, purchase_order_id, goods_receipt_id, number, issue_date, due_date, currency, subtotal, vat, withholding_tax, other_deductions, total, paid_amount, outstanding, etims_reference, status)
     values ($1,$2,nullif($3,'')::uuid,nullif($4,'')::uuid,nullif($5,'')::uuid,$6,$7,$8,$9,$10,$11,$12,$13,$14,0,$15,$16,$17)`,
    [
      id,
      ctx.membership.organizationId,
      fd(formData, "customerId"),
      poId,
      fd(formData, "grnId"),
      number,
      issueDate,
      dueDate,
      fd(formData, "currency") || ctx.membership.currency,
      subtotal,
      vat,
      withholding,
      deductions,
      total,
      outstanding,
      fd(formData, "etimsReference"),
      fd(formData, "status") || "submitted",
    ],
  );
  if (poId) {
    await query(`update purchase_orders set status = 'invoiced', updated_at = now() where id = $1 and organization_id = $2`, [
      poId,
      ctx.membership.organizationId,
    ]);
  }
  await logActivity(ctx, { entityType: "invoice", entityId: id, action: "created", summary: `${ctx.user.fullName} created invoice ${number}.` });
  await refresh(["/app/invoices", "/app/receivables"]);
  redirect(`/app/invoices/${id}`);
}

export async function recordPaymentAction(formData: FormData) {
  const ctx = await requirePermission("payments.write");
  const invoiceId = fd(formData, "invoiceId");
  const invoice = await queryOne<{
    id: string;
    outstanding: string;
    number: string;
    customer_id: string;
    status: string;
  }>(
    `select id, outstanding::text, number, customer_id, status from invoices where id = $1 and organization_id = $2`,
    [invoiceId, ctx.membership.organizationId],
  );
  if (!invoice) throw new Error("Invoice not found.");
  const amount = moneyString(fd(formData, "amount") || "0");
  const applied = applyPaymentToInvoice({ outstanding: invoice.outstanding, paymentAmount: amount });
  const paymentId = crypto.randomUUID();
  await query(
    `insert into payments (id, organization_id, customer_id, payment_date, amount, currency, method, bank_reference, mpesa_reference, withholding_tax, other_deductions, notes)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      paymentId,
      ctx.membership.organizationId,
      invoice.customer_id,
      fd(formData, "paymentDate") || new Date().toISOString().slice(0, 10),
      amount,
      fd(formData, "currency") || ctx.membership.currency,
      fd(formData, "method") || "bank_transfer",
      fd(formData, "bankReference"),
      fd(formData, "mpesaReference"),
      moneyString(fd(formData, "withholdingTax") || "0"),
      moneyString(fd(formData, "otherDeductions") || "0"),
      fd(formData, "notes"),
    ],
  );
  await query(
    `insert into payment_allocations (id, organization_id, payment_id, invoice_id, amount)
     values (gen_random_uuid(),$1,$2,$3,$4)`,
    [ctx.membership.organizationId, paymentId, invoiceId, applied.applied],
  );
  await query(
    `update invoices set paid_amount = coalesce(paid_amount,0) + $1::numeric, outstanding = $2, status = $3, updated_at = now()
     where id = $4 and organization_id = $5`,
    [applied.applied, applied.remainingOutstanding, applied.nextStatus, invoiceId, ctx.membership.organizationId],
  );
  await logActivity(ctx, { entityType: "invoice", entityId: invoiceId, action: "payment", summary: `${ctx.user.fullName} allocated ${applied.applied} to ${invoice.number}.` });
  await notify(ctx, { type: "payment_received", title: "Payment recorded", body: `Payment applied to ${invoice.number}.`, entityType: "invoice", entityId: invoiceId });
  await refresh(["/app/invoices", "/app/payments", "/app/receivables", "/app"]);
}

export async function createFollowupAction(formData: FormData) {
  const ctx = await requirePermission("receivables.write");
  const invoiceId = fd(formData, "invoiceId");
  await query(
    `insert into payment_followups (id, organization_id, invoice_id, customer_id, type, follow_up_date, contact_name, notes, promise_to_pay_date, next_follow_up_date, generated_message, created_by)
     values (gen_random_uuid(),$1,$2,nullif($3,'')::uuid,$4,$5,$6,$7,nullif($8,'')::date,nullif($9,'')::date,$10,$11)`,
    [
      ctx.membership.organizationId,
      invoiceId,
      fd(formData, "customerId"),
      fd(formData, "type") || "email",
      fd(formData, "followUpDate") || new Date().toISOString().slice(0, 10),
      fd(formData, "contactName"),
      fd(formData, "notes"),
      fd(formData, "promiseToPayDate"),
      fd(formData, "nextFollowUpDate"),
      fd(formData, "generatedMessage"),
      ctx.user.id,
    ],
  );
  await query(`update invoices set last_follow_up_at = current_date, next_action = $1 where id = $2 and organization_id = $3`, [
    fd(formData, "nextFollowUpDate") ? `Follow up ${fd(formData, "nextFollowUpDate")}` : fd(formData, "notes"),
    invoiceId,
    ctx.membership.organizationId,
  ]);
  await refresh([`/app/invoices/${invoiceId}`, "/app/receivables"]);
}

export async function generateFollowupAction(formData: FormData) {
  const ctx = await requirePermission("ai.use");
  const invoiceId = fd(formData, "invoiceId");
  const invoice = await queryOne(
    `select i.*, c.name as customer_name, po.number as po_number
     from invoices i
     left join customers c on c.id = i.customer_id
     left join purchase_orders po on po.id = i.purchase_order_id
     where i.id = $1 and i.organization_id = $2`,
    [invoiceId, ctx.membership.organizationId],
  );
  const followups = await query(
    `select type, follow_up_date, notes from payment_followups where invoice_id = $1 and organization_id = $2 order by created_at desc limit 5`,
    [invoiceId, ctx.membership.organizationId],
  );
  const ai = await runAiCapability("generatePaymentFollowup", JSON.stringify({ invoice, followups }));
  return ai;
}

export async function createSupplierAction(formData: FormData) {
  const ctx = await requirePermission("suppliers.write");
  const id = crypto.randomUUID();
  await query(
    `insert into suppliers (id, organization_id, name, category, contact_name, phone, email, tax_pin, location, products_services, payment_terms_days, rating, notes)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      id,
      ctx.membership.organizationId,
      fd(formData, "name"),
      fd(formData, "category"),
      fd(formData, "contactName"),
      fd(formData, "phone"),
      fd(formData, "email"),
      fd(formData, "taxPin"),
      fd(formData, "location"),
      fd(formData, "productsServices"),
      Number(fd(formData, "paymentTermsDays") || 30),
      Number(fd(formData, "rating") || 3),
      fd(formData, "notes"),
    ],
  );
  await refresh(["/app/suppliers"]);
  redirect("/app/suppliers");
}

export async function createRfqAction(formData: FormData) {
  const ctx = await requirePermission("rfqs.write");
  const id = crypto.randomUUID();
  const number = fd(formData, "number") || (await nextNumber(ctx.membership.organizationId, "rfq", "RFQ"));
  await query(
    `insert into rfqs (id, organization_id, number, title, description, required_delivery_date, location, currency, deadline, status)
     values ($1,$2,$3,$4,$5,nullif($6,'')::date,$7,$8,nullif($9,'')::timestamptz,$10)`,
    [
      id,
      ctx.membership.organizationId,
      number,
      fd(formData, "title"),
      fd(formData, "description"),
      fd(formData, "requiredDeliveryDate"),
      fd(formData, "location"),
      fd(formData, "currency") || ctx.membership.currency,
      fd(formData, "deadline"),
      fd(formData, "status") || "draft",
    ],
  );
  await refresh(["/app/rfqs"]);
  redirect("/app/rfqs");
}

export async function uploadQuotationAction(formData: FormData) {
  const ctx = await requirePermission("quotations.write");
  const file = formData.get("file");
  let extraction: Record<string, unknown> | null = null;
  let fileId: string | null = null;
  if (file instanceof File && file.size > 0) {
    const stored = await storeFile({ organizationId: ctx.membership.organizationId, userId: ctx.user.id, file });
    fileId = stored.id;
    const text = await extractTextFromBuffer(stored.buffer, stored.mime, stored.name);
    const ai = await runAiCapability("analyzeQuotation", text || stored.name);
    if (ai.ok) extraction = ai.data as Record<string, unknown>;
  }
  const id = crypto.randomUUID();
  await query(
    `insert into quotations (id, organization_id, rfq_id, supplier_id, supplier_name, currency, validity, delivery_period, payment_terms, warranty, total, file_id, extraction)
     values ($1,$2,nullif($3,'')::uuid,nullif($4,'')::uuid,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)`,
    [
      id,
      ctx.membership.organizationId,
      fd(formData, "rfqId"),
      fd(formData, "supplierId"),
      fd(formData, "supplierName") || String(extraction?.supplierName || ""),
      fd(formData, "currency") || String(extraction?.currency || ctx.membership.currency),
      String(extraction?.validity || ""),
      String(extraction?.deliveryPeriod || ""),
      String(extraction?.paymentTerms || ""),
      String(extraction?.warranty || ""),
      moneyString(String(extraction?.total || fd(formData, "total") || "0")),
      fileId,
      extraction ? JSON.stringify(extraction) : null,
    ],
  );
  await refresh(["/app/quotations"]);
  redirect("/app/quotations");
}

export async function scoreQuotationsAction(formData: FormData) {
  const ctx = await requirePermission("quotations.write");
  const rfqId = fd(formData, "rfqId");
  const rows = await query<{
    id: string;
    supplier_id: string | null;
    supplier_name: string | null;
    total: string;
    delivery_period: string | null;
    warranty: string | null;
    payment_terms: string | null;
  }>(
    `select id, supplier_id, supplier_name, total::text, delivery_period, warranty, payment_terms
     from quotations where organization_id = $1 and ($2 = '' or rfq_id = $2::uuid)`,
    [ctx.membership.organizationId, rfqId],
  );
  const ranked = scoreQuotations(
    rows.map((row) => ({
      supplierId: row.supplier_id || row.id,
      supplierName: row.supplier_name || "Unknown supplier",
      price: row.total,
      deliveryDays: Number((row.delivery_period || "30").replace(/\D/g, "")) || 30,
      warrantyMonths: Number((row.warranty || "0").replace(/\D/g, "")) || 0,
      paymentTermsDays: Number((row.payment_terms || "0").replace(/\D/g, "")) || 0,
      technicalCompliant: true,
      supplierRating: 4,
      complianceScore: 70,
    })),
  );
  for (const item of ranked) {
    const row = rows.find((entry) => (entry.supplier_id || entry.id) === item.supplierId);
    if (row) {
      await query(`update quotations set score = $1 where id = $2 and organization_id = $3`, [
        item.totalScore,
        row.id,
        ctx.membership.organizationId,
      ]);
    }
  }
  await refresh(["/app/quotations"]);
}

export async function createTaskAction(formData: FormData) {
  const ctx = await requirePermission("tasks.write");
  await query(
    `insert into tasks (id, organization_id, title, description, entity_type, entity_id, assigned_to, priority, due_date, status)
     values (gen_random_uuid(),$1,$2,$3,$4,nullif($5,'')::uuid,$6,$7,nullif($8,'')::date,$9)`,
    [
      ctx.membership.organizationId,
      fd(formData, "title"),
      fd(formData, "description"),
      fd(formData, "entityType"),
      fd(formData, "entityId"),
      ctx.user.id,
      fd(formData, "priority") || "medium",
      fd(formData, "dueDate"),
      "open",
    ],
  );
  await refresh(["/app/tasks"]);
}

export async function completeTaskAction(formData: FormData) {
  const ctx = await requirePermission("tasks.write");
  await query(`update tasks set status = 'complete', updated_at = now() where id = $1 and organization_id = $2`, [
    fd(formData, "id"),
    ctx.membership.organizationId,
  ]);
  await refresh(["/app/tasks", "/app"]);
}

export async function inviteMemberAction(formData: FormData) {
  const ctx = await requirePermission("team.invite");
  const email = fd(formData, "email").toLowerCase();
  const role = fd(formData, "role") || "viewer";
  const count = await queryOne<{ count: number }>(
    `select count(*)::int as count from organization_members where organization_id = $1 and status = 'active' and deleted_at is null`,
    [ctx.membership.organizationId],
  );
  assertEntitlement(ctx.membership.planId, "users", count?.count ?? 0);
  const existingUser = await queryOne<{ id: string }>("select id from profiles where lower(email) = $1", [email]);
  if (existingUser) {
    await query(
      `insert into organization_members (id, organization_id, user_id, role, status)
       values (gen_random_uuid(),$1,$2,$3,'active')
       on conflict (organization_id, user_id) do update set role = excluded.role, status = 'active', deleted_at = null`,
      [ctx.membership.organizationId, existingUser.id, role],
    );
  } else {
    await query(
      `insert into invitations (id, organization_id, email, role, token_hash, invited_by, expires_at)
       values (gen_random_uuid(),$1,$2,$3,$4,$5, now() + interval '7 days')`,
      [ctx.membership.organizationId, email, role, crypto.randomUUID(), ctx.user.id],
    );
  }
  await refresh(["/app/settings/team"]);
}

export async function globalSearchAction(queryText: string) {
  const ctx = await requireAuth();
  const q = `%${queryText.trim()}%`;
  if (queryText.trim().length < 2) return [];
  const org = ctx.membership.organizationId;
  const [customers, tenders, invoices, pos, suppliers] = await Promise.all([
    query(`select id, name as title, 'customer' as type from customers where organization_id = $1 and deleted_at is null and (name ilike $2 or tax_pin ilike $2) limit 5`, [org, q]),
    query(`select id, coalesce(reference, title) as title, 'tender' as type from tenders where organization_id = $1 and deleted_at is null and (title ilike $2 or reference ilike $2 or procuring_entity ilike $2) limit 5`, [org, q]),
    query(`select id, number as title, 'invoice' as type from invoices where organization_id = $1 and deleted_at is null and (number ilike $2 or etims_reference ilike $2) limit 5`, [org, q]),
    query(`select id, number as title, 'purchase_order' as type from purchase_orders where organization_id = $1 and deleted_at is null and number ilike $2 limit 5`, [org, q]),
    query(`select id, name as title, 'supplier' as type from suppliers where organization_id = $1 and deleted_at is null and name ilike $2 limit 5`, [org, q]),
  ]);
  return [...customers, ...tenders, ...invoices, ...pos, ...suppliers];
}

export async function copilotAction(question: string) {
  const ctx = await requirePermission("ai.use");
  const dashboard = await (await import("@/lib/data/workspace")).getDashboardData(ctx);
  const overdue = await query(
    `select number, outstanding, due_date from invoices where organization_id = $1 and outstanding::numeric > 0 order by due_date`,
    [ctx.membership.organizationId],
  );
  const tenders = await query(
    `select reference, title, closing_date, closing_time, readiness_percent from tenders where organization_id = $1 and deleted_at is null`,
    [ctx.membership.organizationId],
  );
  return {
    question,
    answer:
      `Using only ${ctx.membership.organizationName} data:\n` +
      `Outstanding receivables: ${dashboard.kpis.outstanding}. Overdue: ${dashboard.kpis.overdue}. ` +
      `Active tenders: ${dashboard.kpis.activeTenders}. ` +
      `Next attention items: ${dashboard.attention.map((item) => item.title).join(" ")} ` +
      `Overdue invoices: ${JSON.stringify(overdue)}. Tenders: ${JSON.stringify(tenders)}. Question was: ${question}`,
  };
}

export async function updateSettingsAction(formData: FormData) {
  const ctx = await requirePermission("settings.write");
  await query(
    `update organizations set name = $1, timezone = $2, currency = $3, vat_rate = $4, updated_at = now() where id = $5`,
    [
      fd(formData, "name") || ctx.membership.organizationName,
      fd(formData, "timezone") || ctx.membership.timezone,
      fd(formData, "currency") || ctx.membership.currency,
      fd(formData, "vatRate") || ctx.membership.vatRate,
      ctx.membership.organizationId,
    ],
  );
  await query(
    `update organization_settings set reminder_days = $1::jsonb, require_grn_before_invoice = $2 where organization_id = $3`,
    [
      fd(formData, "reminderDays") || "[90,60,30,14,7,1]",
      formData.get("requireGrn") !== "false",
      ctx.membership.organizationId,
    ],
  );
  await refresh(["/app/settings"]);
}

export async function choosePlanAction(formData: FormData) {
  const ctx = await requirePermission("org.billing");
  await query(`update subscriptions set plan_id = $1, status = 'active', updated_at = now() where organization_id = $2`, [
    fd(formData, "planId"),
    ctx.membership.organizationId,
  ]);
  await refresh(["/app/settings/billing", "/app/subscription"]);
}

export async function markNotificationReadAction(formData: FormData) {
  const ctx = await requireAuth();
  await query(`update notifications set read_at = now() where id = $1 and organization_id = $2`, [
    fd(formData, "id"),
    ctx.membership.organizationId,
  ]);
  await refresh(["/app/notifications"]);
}
