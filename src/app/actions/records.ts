"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth, requirePermission, requireWrite } from "@/lib/auth/session";
import {
  createDoc,
  docById,
  findProfileByEmail,
  getOrgDoc,
  listByOrg,
  patchDoc,
  saveDoc,
} from "@/lib/db/repo";
import { asString, newId, nowIso } from "@/lib/db/types";
import { getDashboardData, logActivity, nextNumber, notify } from "@/lib/data/workspace";
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
import { hashToken, randomToken } from "@/lib/auth/tokens";
import { getEmailProvider } from "@/lib/email";
import { appUrl } from "@/lib/config/runtime";

function fd(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function orNull(value: string) {
  return value ? value : null;
}

function contains(value: unknown, needle: string) {
  return asString(value).toLowerCase().includes(needle);
}

function parseReminderDays(raw: string) {
  try {
    const parsed = JSON.parse(raw || "[90,60,30,14,7,1]");
    if (Array.isArray(parsed)) return parsed.map((item) => Number(item));
  } catch {
    // keep default
  }
  return [90, 60, 30, 14, 7, 1];
}

function currentPeriod() {
  return nowIso().slice(0, 7);
}

async function refresh(paths: string[]) {
  for (const path of paths) revalidatePath(path);
}

async function consumeAiAnalysis(organizationId: string, planId: string) {
  const period = currentPeriod();
  const jobs = await listByOrg("ai_jobs", organizationId);
  const used = jobs.filter(
    (job) => asString(job.capability) === "analyzeTender" && asString(job.createdAt).startsWith(period),
  ).length;
  assertEntitlement(planId, "aiAnalysesPerMonth", used);
}

export async function createCustomerAction(formData: FormData) {
  const ctx = await requireWrite("customers.write");
  const orgId = ctx.membership.organizationId;
  const existing = await listByOrg("customers", orgId);
  assertEntitlement(ctx.membership.planId, "clients", existing.length);
  const id = newId();
  await createDoc(
    "customers",
    {
      organizationId: orgId,
      name: fd(formData, "name"),
      type: fd(formData, "type") || "corporate",
      industry: fd(formData, "industry"),
      taxPin: fd(formData, "taxPin"),
      paymentTermsDays: Number(fd(formData, "paymentTermsDays") || 30),
      defaultCurrency: fd(formData, "currency") || ctx.membership.currency,
      address: fd(formData, "address"),
      phone: fd(formData, "phone"),
      email: fd(formData, "email"),
      notes: fd(formData, "notes"),
      deletedAt: null,
    },
    id,
  );
  await logActivity(ctx, {
    entityType: "customer",
    entityId: id,
    action: "created",
    summary: `${ctx.user.fullName} added customer ${fd(formData, "name")}.`,
  });
  await refresh(["/app/customers"]);
  redirect(`/app/customers/${id}`);
}

export async function createOpportunityAction(formData: FormData) {
  const ctx = await requireWrite("opportunities.write");
  const id = newId();
  await createDoc(
    "opportunities",
    {
      organizationId: ctx.membership.organizationId,
      customerId: orNull(fd(formData, "customerId")),
      title: fd(formData, "title"),
      estimatedValue: moneyString(fd(formData, "estimatedValue") || "0"),
      probability: Number(fd(formData, "probability") || 10),
      expectedCloseDate: orNull(fd(formData, "expectedCloseDate")),
      source: fd(formData, "source"),
      ownerId: ctx.user.id,
      stage: fd(formData, "stage") || "identified",
      notes: fd(formData, "notes"),
      deletedAt: null,
    },
    id,
  );
  await logActivity(ctx, {
    entityType: "opportunity",
    entityId: id,
    action: "created",
    summary: `${ctx.user.fullName} created opportunity ${fd(formData, "title")}.`,
  });
  await refresh(["/app/opportunities"]);
  redirect("/app/opportunities");
}

export async function updateOpportunityStageAction(formData: FormData) {
  const ctx = await requireWrite("opportunities.write");
  const id = fd(formData, "id");
  const row = await getOrgDoc("opportunities", ctx.membership.organizationId, id);
  if (row) {
    await patchDoc("opportunities", id, { stage: fd(formData, "stage") });
  }
  await refresh(["/app/opportunities"]);
}

export async function createTenderAction(formData: FormData) {
  const ctx = await requireWrite("tenders.write");
  const orgId = ctx.membership.organizationId;
  const tenders = await listByOrg("tenders", orgId);
  const active = tenders.filter((row) => !["lost", "cancelled"].includes(asString(row.status))).length;
  assertEntitlement(ctx.membership.planId, "activeTenders", active);
  const closingDate = orNull(fd(formData, "closingDate"));
  const closingTime = fd(formData, "closingTime") || "10:00";
  const timezone = ctx.membership.timezone;
  const closingAt = closingDate ? combineLocalDateTime(closingDate, closingTime, timezone) : null;
  const id = newId();
  await createDoc(
    "tenders",
    {
      organizationId: orgId,
      customerId: orNull(fd(formData, "customerId")),
      title: fd(formData, "title"),
      reference: fd(formData, "reference"),
      procuringEntity: fd(formData, "procuringEntity"),
      category: fd(formData, "category"),
      closingDate,
      closingTime,
      timezone,
      closingAt: closingAt?.toISOString() ?? null,
      submissionMethod: fd(formData, "submissionMethod"),
      submissionLocation: fd(formData, "submissionLocation"),
      tenderValue: fd(formData, "tenderValue") ? moneyString(fd(formData, "tenderValue")) : null,
      currency: fd(formData, "currency") || ctx.membership.currency,
      tenderSecurityAmount: fd(formData, "tenderSecurityAmount")
        ? moneyString(fd(formData, "tenderSecurityAmount"))
        : null,
      tenderValidityPeriod: fd(formData, "tenderValidityPeriod"),
      status: fd(formData, "status") || "draft",
      assignedTo: ctx.user.id,
      readinessPercent: 0,
      deletedAt: null,
    },
    id,
  );
  await logActivity(ctx, {
    entityType: "tender",
    entityId: id,
    action: "created",
    summary: `${ctx.user.fullName} created tender ${fd(formData, "reference") || fd(formData, "title")}.`,
  });
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
  const orgId = ctx.membership.organizationId;
  await consumeAiAnalysis(orgId, ctx.membership.planId);
  const stored = await storeFile({ organizationId: orgId, userId: ctx.user.id, file });
  const text = await extractTextFromBuffer(stored.buffer, stored.mime, stored.name);
  await patchDoc("tenders", tenderId, {
    extractedText: text,
    fileId: stored.id,
  });
  const ai = await runAiCapability("analyzeTender", text || file.name);
  if (!ai.ok) {
    await createDoc("ai_jobs", {
      organizationId: orgId,
      capability: "analyzeTender",
      status: "failed",
      entityType: "tender",
      entityId: tenderId,
      error: ai.error,
      createdBy: ctx.user.id,
      completedAt: nowIso(),
    });
    return;
  }
  const parsed = analyzeTenderSchema.parse(ai.data);
  const tender = await getOrgDoc("tenders", orgId, tenderId);
  await patchDoc("tenders", tenderId, {
    title: parsed.title || tender?.title,
    reference: parsed.reference || tender?.reference,
    procuringEntity: parsed.procuringEntity || tender?.procuringEntity,
    category: parsed.category || tender?.category,
    closingDate: parsed.closingDate || tender?.closingDate,
    closingTime: parsed.closingTime || tender?.closingTime,
    submissionMethod: parsed.submissionMethod || tender?.submissionMethod,
    submissionLocation: parsed.submissionLocation || tender?.submissionLocation,
    tenderValue: parsed.tenderValue ? moneyString(parsed.tenderValue) : tender?.tenderValue,
    tenderSecurityAmount: parsed.tenderSecurityAmount
      ? moneyString(parsed.tenderSecurityAmount)
      : tender?.tenderSecurityAmount,
    tenderValidityPeriod: parsed.tenderValidityPeriod || tender?.tenderValidityPeriod,
    analysis: parsed,
  });
  const vault = await listByOrg("company_documents", orgId);
  const vaultDocs = vault.map((doc) => ({
    id: asString(doc.id),
    name: asString(doc.name),
    category: asString(doc.category),
    tags: Array.isArray(doc.tags) ? (doc.tags as string[]) : [],
    expiryDate: doc.expiryDate ? asString(doc.expiryDate) : null,
    coverageYear: doc.coverageYear == null ? null : Number(doc.coverageYear),
  }));
  const existingReqs = await listByOrg("tender_requirements", orgId, {
    where: [{ field: "tenderId", op: "==", value: tenderId }],
  });
  for (const req of existingReqs) {
    await patchDoc("tender_requirements", asString(req.id), { deletedAt: nowIso() });
  }
  for (const requirement of parsed.requirements) {
    const match = matchRequirementToVault(requirement.text, vaultDocs);
    await createDoc("tender_requirements", {
      organizationId: orgId,
      tenderId,
      requirementText: requirement.text,
      category: requirement.category,
      sourceDocument: requirement.source ?? "Uploaded tender",
      pageNumber: requirement.pageNumber ?? null,
      mandatory: requirement.mandatory,
      status: match.status,
      evidenceDocumentId: match.evidenceDocumentId,
      matchReason: match.reason,
      confidence: match.confidence,
    });
  }
  const reqs = await listByOrg("tender_requirements", orgId, {
    where: [{ field: "tenderId", op: "==", value: tenderId }],
  });
  const readiness = calculateTenderReadiness(
    reqs.map((row) => ({
      category: asString(row.category),
      mandatory: Boolean(row.mandatory),
      status: asString(row.status),
    })),
  );
  await patchDoc("tenders", tenderId, { readinessPercent: readiness.percent });
  await createDoc("ai_jobs", {
    organizationId: orgId,
    capability: "analyzeTender",
    status: "complete",
    entityType: "tender",
    entityId: tenderId,
    output: parsed,
    confidence: ai.confidence,
    createdBy: ctx.user.id,
    completedAt: nowIso(),
  });
}

export async function rerunTenderAnalysisAction(formData: FormData) {
  const ctx = await requireWrite("tenders.write");
  const tenderId = fd(formData, "tenderId");
  const tender = await getOrgDoc("tenders", ctx.membership.organizationId, tenderId);
  const extracted = asString(tender?.extractedText);
  if (!extracted) throw new Error("No extracted tender text is available.");
  const fakeFile = new File([extracted], "tender.txt", { type: "text/plain" });
  await analyzeTenderDocument(ctx, tenderId, fakeFile);
  await refresh([`/app/tenders/${tenderId}`]);
}

export async function runBidAuditAction(formData: FormData) {
  const ctx = await requireWrite("tenders.write");
  const tenderId = fd(formData, "tenderId");
  const orgId = ctx.membership.organizationId;
  const tender = await getOrgDoc("tenders", orgId, tenderId);
  const requirements = await listByOrg("tender_requirements", orgId, {
    where: [{ field: "tenderId", op: "==", value: tenderId }],
  });
  const ai = await runAiCapability("runBidAudit", JSON.stringify({ ...tender, requirements }));
  await createDoc("ai_jobs", {
    organizationId: orgId,
    capability: "runBidAudit",
    status: ai.ok ? "complete" : "failed",
    entityType: "tender",
    entityId: tenderId,
    output: ai.ok ? ai.data : null,
    error: ai.ok ? null : ai.error,
    confidence: ai.ok ? ai.confidence : "failed",
    createdBy: ctx.user.id,
    completedAt: nowIso(),
  });
  await refresh([`/app/tenders/${tenderId}`]);
}

export async function uploadVaultDocumentAction(formData: FormData) {
  const ctx = await requireWrite("vault.write");
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
  const id = newId();
  await createDoc(
    "company_documents",
    {
      organizationId: ctx.membership.organizationId,
      fileId,
      name: meta.documentName || "Untitled document",
      category: meta.category,
      documentNumber: meta.documentNumber,
      issuingAuthority: meta.issuingAuthority,
      issueDate: orNull(meta.issueDate),
      expiryDate: orNull(meta.expiryDate),
      country: ctx.membership.country,
      tags: meta.tags ? meta.tags.split(",").map((item) => item.trim()).filter(Boolean) : [],
      notes: fd(formData, "notes"),
      deletedAt: null,
    },
    id,
  );
  await logActivity(ctx, {
    entityType: "company_document",
    entityId: id,
    action: "uploaded",
    summary: `${ctx.user.fullName} uploaded ${meta.documentName}.`,
  });
  await refresh(["/app/vault"]);
  redirect("/app/vault");
}

export async function createPurchaseOrderAction(formData: FormData) {
  const ctx = await requireWrite("purchase_orders.write");
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
  const id = newId();
  const total = moneyString(fd(formData, "total") || String(extracted?.total || "0"));
  const tax = moneyString(fd(formData, "tax") || String(extracted?.tax || "0"));
  const subtotal = moneyString(fd(formData, "subtotal") || String(extracted?.subtotal || subtractMoney(total, tax)));
  await createDoc(
    "purchase_orders",
    {
      organizationId: ctx.membership.organizationId,
      customerId: orNull(fd(formData, "customerId")),
      number,
      issueDate: orNull(fd(formData, "issueDate") || String(extracted?.issueDate || "")),
      currency: fd(formData, "currency") || String(extracted?.currency || ctx.membership.currency),
      paymentTermsDays: Number(fd(formData, "paymentTermsDays") || 30),
      paymentTermsText: fd(formData, "paymentTermsText") || String(extracted?.paymentTerms || ""),
      deliveryLocation: fd(formData, "deliveryLocation") || String(extracted?.deliveryLocation || ""),
      deliveryDeadline: orNull(fd(formData, "deliveryDeadline") || String(extracted?.deliveryDeadline || "")),
      contactPerson: fd(formData, "contactPerson") || String(extracted?.contactPerson || ""),
      specialConditions: fd(formData, "specialConditions") || String(extracted?.specialConditions || ""),
      subtotal,
      tax,
      total,
      status: fd(formData, "status") || "received",
      requiresGrn: formData.get("requiresGrn") !== "false",
      fileId,
      extraction: extracted,
      deletedAt: null,
    },
    id,
  );
  const items = Array.isArray(extracted?.lineItems) ? (extracted.lineItems as Array<Record<string, string>>) : [];
  for (const item of items) {
    await createDoc("purchase_order_items", {
      organizationId: ctx.membership.organizationId,
      purchaseOrderId: id,
      description: item.description,
      quantity: String(item.quantity ?? ""),
      unitPrice: moneyString(item.unitPrice || "0"),
      tax: moneyString(item.tax || "0"),
      total: moneyString(item.total || "0"),
    });
  }
  await logActivity(ctx, {
    entityType: "purchase_order",
    entityId: id,
    action: "created",
    summary: `${ctx.user.fullName} created ${number}.`,
  });
  await refresh(["/app/purchase-orders"]);
  redirect(`/app/purchase-orders/${id}`);
}

export async function createDeliveryAction(formData: FormData) {
  const ctx = await requireWrite("deliveries.write");
  const id = newId();
  const number = fd(formData, "number") || (await nextNumber(ctx.membership.organizationId, "dn", "DN"));
  const purchaseOrderId = orNull(fd(formData, "purchaseOrderId"));
  const status = fd(formData, "status") || "scheduled";
  await createDoc(
    "deliveries",
    {
      organizationId: ctx.membership.organizationId,
      customerId: orNull(fd(formData, "customerId")),
      purchaseOrderId,
      number,
      deliveryDate: orNull(fd(formData, "deliveryDate")),
      location: fd(formData, "location"),
      deliveredBy: fd(formData, "deliveredBy"),
      receivedBy: fd(formData, "receivedBy"),
      status,
      notes: fd(formData, "notes"),
      deletedAt: null,
    },
    id,
  );
  if (purchaseOrderId && status === "delivered") {
    const po = await getOrgDoc("purchase_orders", ctx.membership.organizationId, purchaseOrderId);
    if (po) {
      await patchDoc("purchase_orders", purchaseOrderId, { status: "awaiting_grn" });
    }
  }
  await logActivity(ctx, {
    entityType: "delivery",
    entityId: id,
    action: "created",
    summary: `${ctx.user.fullName} recorded delivery ${number}.`,
  });
  await refresh(["/app/deliveries"]);
  redirect("/app/deliveries");
}

export async function createGrnAction(formData: FormData) {
  const ctx = await requireWrite("grns.write");
  const id = newId();
  const number = fd(formData, "number") || (await nextNumber(ctx.membership.organizationId, "grn", "GRN"));
  let fileId: string | null = null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    fileId = (await storeFile({ organizationId: ctx.membership.organizationId, userId: ctx.user.id, file })).id;
  }
  const purchaseOrderId = orNull(fd(formData, "purchaseOrderId"));
  await createDoc(
    "goods_receipts",
    {
      organizationId: ctx.membership.organizationId,
      customerId: orNull(fd(formData, "customerId")),
      purchaseOrderId,
      deliveryId: orNull(fd(formData, "deliveryId")),
      number,
      grnDate: orNull(fd(formData, "grnDate")),
      status: fd(formData, "status") || "signed",
      fileId,
      notes: fd(formData, "notes"),
      deletedAt: null,
    },
    id,
  );
  if (purchaseOrderId) {
    const po = await getOrgDoc("purchase_orders", ctx.membership.organizationId, purchaseOrderId);
    if (po) {
      await patchDoc("purchase_orders", purchaseOrderId, { status: "ready_to_invoice" });
    }
  }
  await logActivity(ctx, {
    entityType: "grn",
    entityId: id,
    action: "created",
    summary: `${ctx.user.fullName} recorded ${number}.`,
  });
  await refresh(["/app/grns", "/app/purchase-orders"]);
  redirect("/app/grns");
}

export async function createInvoiceAction(formData: FormData) {
  const ctx = await requireWrite("invoices.write");
  const orgId = ctx.membership.organizationId;
  const poId = fd(formData, "purchaseOrderId");
  if (poId) {
    const po = await getOrgDoc("purchase_orders", orgId, poId);
    const grns = await listByOrg("goods_receipts", orgId, {
      where: [{ field: "purchaseOrderId", op: "==", value: poId }],
    });
    const hasSignedGrn = grns.some((row) => ["signed", "complete"].includes(asString(row.status)));
    const gate = canInvoicePurchaseOrder({
      requiresGrn: Boolean(po?.requiresGrn),
      hasSignedGrn,
    });
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
  const outstanding = invoiceOutstanding({
    total,
    withholdingTax: withholding,
    otherDeductions: deductions,
    paidAmount: "0",
  });
  const number = fd(formData, "number") || (await nextNumber(orgId, "inv", "INV"));
  const id = newId();
  await createDoc(
    "invoices",
    {
      organizationId: orgId,
      customerId: orNull(fd(formData, "customerId")),
      purchaseOrderId: orNull(poId),
      goodsReceiptId: orNull(fd(formData, "grnId")),
      number,
      issueDate,
      dueDate,
      currency: fd(formData, "currency") || ctx.membership.currency,
      subtotal,
      vat,
      withholdingTax: withholding,
      otherDeductions: deductions,
      total,
      paidAmount: moneyString("0"),
      outstanding,
      etimsReference: orNull(fd(formData, "etimsReference")),
      status: fd(formData, "status") || "submitted",
      deletedAt: null,
    },
    id,
  );
  if (poId) {
    const po = await getOrgDoc("purchase_orders", orgId, poId);
    if (po) {
      await patchDoc("purchase_orders", poId, { status: "invoiced" });
    }
  }
  await logActivity(ctx, {
    entityType: "invoice",
    entityId: id,
    action: "created",
    summary: `${ctx.user.fullName} created invoice ${number}.`,
  });
  await refresh(["/app/invoices", "/app/receivables"]);
  redirect(`/app/invoices/${id}`);
}

export async function recordPaymentAction(formData: FormData) {
  const ctx = await requireWrite("payments.write");
  const orgId = ctx.membership.organizationId;
  const invoiceId = fd(formData, "invoiceId");
  const invoice = await getOrgDoc("invoices", orgId, invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  const amount = moneyString(fd(formData, "amount") || "0");
  const applied = applyPaymentToInvoice({
    outstanding: moneyString(asString(invoice.outstanding, "0")),
    paymentAmount: amount,
  });
  const paymentId = newId();
  await createDoc(
    "payments",
    {
      organizationId: orgId,
      customerId: invoice.customerId ? asString(invoice.customerId) : null,
      paymentDate: fd(formData, "paymentDate") || new Date().toISOString().slice(0, 10),
      amount,
      currency: fd(formData, "currency") || ctx.membership.currency,
      method: fd(formData, "method") || "bank_transfer",
      bankReference: fd(formData, "bankReference"),
      mpesaReference: fd(formData, "mpesaReference"),
      withholdingTax: moneyString(fd(formData, "withholdingTax") || "0"),
      otherDeductions: moneyString(fd(formData, "otherDeductions") || "0"),
      notes: fd(formData, "notes"),
      deletedAt: null,
    },
    paymentId,
  );
  await createDoc("payment_allocations", {
    organizationId: orgId,
    paymentId,
    invoiceId,
    amount: applied.applied,
  });
  await patchDoc("invoices", invoiceId, {
    paidAmount: addMoney(asString(invoice.paidAmount, "0"), applied.applied),
    outstanding: applied.remainingOutstanding,
    status: applied.nextStatus,
  });
  await logActivity(ctx, {
    entityType: "invoice",
    entityId: invoiceId,
    action: "payment",
    summary: `${ctx.user.fullName} allocated ${applied.applied} to ${asString(invoice.number)}.`,
  });
  await notify(ctx, {
    type: "payment_received",
    title: "Payment recorded",
    body: `Payment applied to ${asString(invoice.number)}.`,
    entityType: "invoice",
    entityId: invoiceId,
  });
  await refresh(["/app/invoices", "/app/payments", "/app/receivables", "/app"]);
}

export async function createFollowupAction(formData: FormData) {
  const ctx = await requireWrite("receivables.write");
  const invoiceId = fd(formData, "invoiceId");
  const invoice = await getOrgDoc("invoices", ctx.membership.organizationId, invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  await createDoc("payment_followups", {
    organizationId: ctx.membership.organizationId,
    invoiceId,
    customerId: orNull(fd(formData, "customerId")),
    type: fd(formData, "type") || "email",
    followUpDate: fd(formData, "followUpDate") || new Date().toISOString().slice(0, 10),
    contactName: fd(formData, "contactName"),
    notes: fd(formData, "notes"),
    promiseToPayDate: orNull(fd(formData, "promiseToPayDate")),
    nextFollowUpDate: orNull(fd(formData, "nextFollowUpDate")),
    generatedMessage: fd(formData, "generatedMessage"),
    createdBy: ctx.user.id,
  });
  await patchDoc("invoices", invoiceId, {
    lastFollowUpAt: new Date().toISOString().slice(0, 10),
    nextAction: fd(formData, "nextFollowUpDate")
      ? `Follow up ${fd(formData, "nextFollowUpDate")}`
      : fd(formData, "notes"),
  });
  await refresh([`/app/invoices/${invoiceId}`, "/app/receivables"]);
}

export async function generateFollowupAction(formData: FormData) {
  const ctx = await requireWrite("ai.use");
  const invoiceId = fd(formData, "invoiceId");
  const orgId = ctx.membership.organizationId;
  const invoice = await getOrgDoc("invoices", orgId, invoiceId);
  const customer = invoice?.customerId ? await getOrgDoc("customers", orgId, asString(invoice.customerId)) : null;
  const po = invoice?.purchaseOrderId
    ? await getOrgDoc("purchase_orders", orgId, asString(invoice.purchaseOrderId))
    : null;
  const followups = (
    await listByOrg("payment_followups", orgId, {
      where: [{ field: "invoiceId", op: "==", value: invoiceId }],
      orderBy: [{ field: "createdAt", direction: "desc" }],
      limit: 5,
    })
  ).map((row) => ({
    type: row.type,
    followUpDate: row.followUpDate,
    notes: row.notes,
  }));
  const ai = await runAiCapability(
    "generatePaymentFollowup",
    JSON.stringify({
      invoice: {
        ...invoice,
        customer_name: customer ? asString(customer.name) : null,
        po_number: po ? asString(po.number) : null,
      },
      followups,
    }),
  );
  return ai;
}

export async function createSupplierAction(formData: FormData) {
  const ctx = await requireWrite("suppliers.write");
  const id = newId();
  await createDoc(
    "suppliers",
    {
      organizationId: ctx.membership.organizationId,
      name: fd(formData, "name"),
      category: fd(formData, "category"),
      contactName: fd(formData, "contactName"),
      phone: fd(formData, "phone"),
      email: fd(formData, "email"),
      taxPin: fd(formData, "taxPin"),
      location: fd(formData, "location"),
      productsServices: fd(formData, "productsServices"),
      paymentTermsDays: Number(fd(formData, "paymentTermsDays") || 30),
      rating: Number(fd(formData, "rating") || 3),
      notes: fd(formData, "notes"),
      deletedAt: null,
    },
    id,
  );
  await refresh(["/app/suppliers"]);
  redirect("/app/suppliers");
}

export async function createRfqAction(formData: FormData) {
  const ctx = await requireWrite("rfqs.write");
  const id = newId();
  const number = fd(formData, "number") || (await nextNumber(ctx.membership.organizationId, "rfq", "RFQ"));
  await createDoc(
    "rfqs",
    {
      organizationId: ctx.membership.organizationId,
      number,
      title: fd(formData, "title"),
      description: fd(formData, "description"),
      requiredDeliveryDate: orNull(fd(formData, "requiredDeliveryDate")),
      location: fd(formData, "location"),
      currency: fd(formData, "currency") || ctx.membership.currency,
      deadline: orNull(fd(formData, "deadline")),
      status: fd(formData, "status") || "draft",
      deletedAt: null,
    },
    id,
  );
  await refresh(["/app/rfqs"]);
  redirect("/app/rfqs");
}

export async function uploadQuotationAction(formData: FormData) {
  const ctx = await requireWrite("quotations.write");
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
  const id = newId();
  await createDoc(
    "quotations",
    {
      organizationId: ctx.membership.organizationId,
      rfqId: orNull(fd(formData, "rfqId")),
      supplierId: orNull(fd(formData, "supplierId")),
      supplierName: fd(formData, "supplierName") || String(extraction?.supplierName || ""),
      currency: fd(formData, "currency") || String(extraction?.currency || ctx.membership.currency),
      validity: String(extraction?.validity || ""),
      deliveryPeriod: String(extraction?.deliveryPeriod || ""),
      paymentTerms: String(extraction?.paymentTerms || ""),
      warranty: String(extraction?.warranty || ""),
      total: moneyString(String(extraction?.total || fd(formData, "total") || "0")),
      fileId,
      extraction,
      deletedAt: null,
    },
    id,
  );
  await refresh(["/app/quotations"]);
  redirect("/app/quotations");
}

export async function scoreQuotationsAction(formData: FormData) {
  const ctx = await requireWrite("quotations.write");
  const rfqId = fd(formData, "rfqId");
  const rows = await listByOrg("quotations", ctx.membership.organizationId);
  const filtered = rfqId ? rows.filter((row) => asString(row.rfqId) === rfqId) : rows;
  const ranked = scoreQuotations(
    filtered.map((row) => ({
      supplierId: asString(row.supplierId || row.id),
      supplierName: asString(row.supplierName, "Unknown supplier"),
      price: moneyString(asString(row.total, "0")),
      deliveryDays: Number((asString(row.deliveryPeriod, "30") || "30").replace(/\D/g, "")) || 30,
      warrantyMonths: Number((asString(row.warranty, "0") || "0").replace(/\D/g, "")) || 0,
      paymentTermsDays: Number((asString(row.paymentTerms, "0") || "0").replace(/\D/g, "")) || 0,
      technicalCompliant: true,
      supplierRating: 4,
      complianceScore: 70,
    })),
  );
  for (const item of ranked) {
    const row = filtered.find((entry) => asString(entry.supplierId || entry.id) === item.supplierId);
    if (row) {
      await patchDoc("quotations", asString(row.id), { score: item.totalScore });
    }
  }
  await refresh(["/app/quotations"]);
}

export async function createTaskAction(formData: FormData) {
  const ctx = await requireWrite("tasks.write");
  await createDoc("tasks", {
    organizationId: ctx.membership.organizationId,
    title: fd(formData, "title"),
    description: fd(formData, "description"),
    entityType: fd(formData, "entityType"),
    entityId: orNull(fd(formData, "entityId")),
    assignedTo: ctx.user.id,
    priority: fd(formData, "priority") || "medium",
    dueDate: orNull(fd(formData, "dueDate")),
    status: "open",
    deletedAt: null,
  });
  await refresh(["/app/tasks"]);
}

export async function completeTaskAction(formData: FormData) {
  const ctx = await requireWrite("tasks.write");
  const id = fd(formData, "id");
  const task = await getOrgDoc("tasks", ctx.membership.organizationId, id);
  if (task) {
    await patchDoc("tasks", id, { status: "complete" });
  }
  await refresh(["/app/tasks", "/app"]);
}

export async function inviteMemberAction(formData: FormData) {
  const ctx = await requireWrite("team.invite");
  const orgId = ctx.membership.organizationId;
  const email = fd(formData, "email").toLowerCase();
  const role = fd(formData, "role") || "viewer";
  const members = await listByOrg("organization_members", orgId, { includeDeleted: true });
  const activeCount = members.filter((row) => asString(row.status) === "active" && !row.deletedAt).length;
  assertEntitlement(ctx.membership.planId, "users", activeCount);
  const existingUser = await findProfileByEmail(email);
  if (existingUser) {
    const existingMember = members.find((row) => asString(row.userId) === asString(existingUser.id));
    if (existingMember) {
      await patchDoc("organization_members", asString(existingMember.id), {
        role,
        status: "active",
        deletedAt: null,
      });
    } else {
      await createDoc("organization_members", {
        organizationId: orgId,
        userId: asString(existingUser.id),
        role,
        status: "active",
        deletedAt: null,
      });
    }
  } else {
    const token = randomToken();
    await createDoc("organization_members", {
      organizationId: orgId,
      userId: null,
      invitedEmail: email,
      role,
      status: "invited",
      tokenHash: hashToken(token),
      invitedBy: ctx.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      deletedAt: null,
    });
    const link = `${appUrl()}/invite?token=${encodeURIComponent(token)}`;
    await getEmailProvider().send({
      to: email,
      subject: `Join ${ctx.membership.organizationName} on SupplierOS Africa`,
      html: `<p>You have been invited to ${ctx.membership.organizationName} as ${role}.</p><p><a href="${link}">Accept invite</a></p>`,
      text: `Accept invite: ${link}`,
    });
  }
  await refresh(["/app/settings/team", "/app/team"]);
}

export async function globalSearchAction(queryText: string) {
  const ctx = await requireAuth();
  const needle = queryText.trim().toLowerCase();
  if (needle.length < 2) return [];
  const org = ctx.membership.organizationId;
  const [customers, tenders, invoices, pos, suppliers] = await Promise.all([
    listByOrg("customers", org),
    listByOrg("tenders", org),
    listByOrg("invoices", org),
    listByOrg("purchase_orders", org),
    listByOrg("suppliers", org),
  ]);
  return [
    ...customers
      .filter((row) => contains(row.name, needle) || contains(row.taxPin, needle))
      .slice(0, 5)
      .map((row) => ({ id: asString(row.id), title: asString(row.name), type: "customer" })),
    ...tenders
      .filter(
        (row) =>
          contains(row.title, needle) || contains(row.reference, needle) || contains(row.procuringEntity, needle),
      )
      .slice(0, 5)
      .map((row) => ({
        id: asString(row.id),
        title: asString(row.reference || row.title),
        type: "tender",
      })),
    ...invoices
      .filter((row) => contains(row.number, needle) || contains(row.etimsReference, needle))
      .slice(0, 5)
      .map((row) => ({ id: asString(row.id), title: asString(row.number), type: "invoice" })),
    ...pos
      .filter((row) => contains(row.number, needle))
      .slice(0, 5)
      .map((row) => ({ id: asString(row.id), title: asString(row.number), type: "purchase_order" })),
    ...suppliers
      .filter((row) => contains(row.name, needle))
      .slice(0, 5)
      .map((row) => ({ id: asString(row.id), title: asString(row.name), type: "supplier" })),
  ];
}

export async function copilotAction(question: string) {
  const ctx = await requirePermission("ai.use");
  const orgId = ctx.membership.organizationId;
  const dashboard = await getDashboardData(ctx);
  const invoices = await listByOrg("invoices", orgId);
  const overdue = invoices
    .filter((row) => Number(asString(row.outstanding, "0")) > 0)
    .sort((a, b) => asString(a.dueDate).localeCompare(asString(b.dueDate)))
    .map((row) => ({
      number: row.number,
      outstanding: row.outstanding,
      dueDate: row.dueDate,
    }));
  const tenders = (await listByOrg("tenders", orgId)).map((row) => ({
    reference: row.reference,
    title: row.title,
    closingDate: row.closingDate,
    closingTime: row.closingTime,
    readinessPercent: row.readinessPercent,
  }));
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
  const ctx = await requireWrite("settings.write");
  const orgId = ctx.membership.organizationId;
  await patchDoc("organizations", orgId, {
    name: fd(formData, "name") || ctx.membership.organizationName,
    timezone: fd(formData, "timezone") || ctx.membership.timezone,
    currency: fd(formData, "currency") || ctx.membership.currency,
    vatRate: fd(formData, "vatRate") || ctx.membership.vatRate,
  });
  const settings = await docById("organization_settings", orgId);
  const settingsPayload = {
    organizationId: orgId,
    reminderDays: parseReminderDays(fd(formData, "reminderDays")),
    requireGrnBeforeInvoice: formData.get("requireGrn") !== "false",
  };
  if (settings) {
    await patchDoc("organization_settings", orgId, settingsPayload);
  } else {
    await saveDoc("organization_settings", orgId, settingsPayload);
  }
  await refresh(["/app/settings"]);
}

export async function choosePlanAction(formData: FormData) {
  const { startCheckoutAction } = await import("@/app/actions/billing");
  return startCheckoutAction(formData);
}

export async function markNotificationReadAction(formData: FormData) {
  const ctx = await requireAuth();
  const id = fd(formData, "id");
  const notification = await getOrgDoc("notifications", ctx.membership.organizationId, id);
  if (notification) {
    await patchDoc("notifications", id, { readAt: nowIso() });
  }
  await refresh(["/app/notifications"]);
}
