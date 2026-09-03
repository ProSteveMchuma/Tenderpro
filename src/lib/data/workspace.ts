import { AuthContext } from "@/lib/auth/session";
import { getDatabaseDriver } from "@/lib/db/client";
import { createDoc, listByOrg, nextSequence } from "@/lib/db/repo";
import { asString, moneyString as moneyField } from "@/lib/db/types";
import { addMoney, moneyString } from "@/lib/money";
import { ageingBucket, daysOverdue, daysUntil, expiryStatus } from "@/lib/dates";
import { calculateTenderReadiness } from "@/lib/domain/tender-readiness";
import { invoiceOutstanding } from "@/lib/domain/invoice";

export async function logActivity(
  ctx: AuthContext,
  input: { entityType: string; entityId?: string | null; action: string; summary: string },
) {
  await createDoc("activity_events", {
    organizationId: ctx.membership.organizationId,
    actorId: ctx.user.id,
    actorName: ctx.user.fullName,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    action: input.action,
    summary: input.summary,
  });
}

export async function notify(
  ctx: AuthContext,
  input: { type: string; title: string; body: string; entityType?: string; entityId?: string },
) {
  await createDoc("notifications", {
    organizationId: ctx.membership.organizationId,
    userId: ctx.user.id,
    type: input.type,
    title: input.title,
    body: input.body,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    readAt: null,
  });
}

export async function nextNumber(organizationId: string, kind: string, prefix: string) {
  if (getDatabaseDriver() === "firestore") {
    return nextSequence(organizationId, kind, prefix);
  }
  const { queryOne } = await import("@/lib/db/client");
  const row = await queryOne<{ next_number: number }>(
    `insert into sequences (organization_id, kind, next_number)
     values ($1,$2,2)
     on conflict (organization_id, kind)
     do update set next_number = sequences.next_number + 1
     returning next_number`,
    [organizationId, kind],
  );
  const n = (row?.next_number ?? 2) - 1;
  return `${prefix}-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
}

export async function getDashboardData(ctx: AuthContext) {
  const orgId = ctx.membership.organizationId;
  const invoices = await listByOrg("invoices", orgId);
  const now = new Date();
  let outstanding = "0";
  let overdue = "0";
  let dueThisWeek = "0";
  const ageing = { "0-30": "0", "31-60": "0", "61-90": "0", "90+": "0" };
  const invoiceStatusMap = new Map<string, string>();

  for (const invoice of invoices) {
    const amount = moneyString(moneyField(invoice.outstanding));
    outstanding = addMoney(outstanding, amount);
    const dueDate = asString(invoice.dueDate);
    const status = asString(invoice.status);
    invoiceStatusMap.set(status, addMoney(invoiceStatusMap.get(status) ?? "0", moneyField(invoice.total)));
    const overdueDays = daysOverdue(dueDate, now);
    if (overdueDays > 0 && amount !== "0.00") {
      overdue = addMoney(overdue, amount);
      const bucket = ageingBucket(overdueDays);
      ageing[bucket] = addMoney(ageing[bucket], amount);
    } else if (amount !== "0.00") {
      ageing["0-30"] = addMoney(ageing["0-30"], amount);
      const until = daysUntil(dueDate, now);
      if (until <= 7) dueThisWeek = addMoney(dueThisWeek, amount);
    }
  }

  const tenders = await listByOrg("tenders", orgId);
  const pos = await listByOrg("purchase_orders", orgId);
  const documents = await listByOrg("company_documents", orgId);
  const opportunities = await listByOrg("opportunities", orgId);

  const activeTenders = tenders.filter((row) => !["lost", "cancelled", "awarded"].includes(asString(row.status))).length;
  const posInProgress = pos.filter((row) => !["closed", "cancelled", "invoiced"].includes(asString(row.status))).length;
  const documentsExpiring = documents.filter((row) => {
    if (!row.expiryDate) return false;
    const remaining = daysUntil(asString(row.expiryDate), now);
    return remaining >= 0 && remaining <= 30;
  }).length;

  const pipeline = opportunities
    .filter((row) => !["lost", "cancelled"].includes(asString(row.stage)))
    .reduce((sum, row) => addMoney(sum, moneyField(row.estimatedValue)), "0");
  const tenderPipeline = tenders
    .filter((row) => !["lost", "cancelled"].includes(asString(row.status)))
    .reduce((sum, row) => addMoney(sum, moneyField(row.tenderValue)), "0");

  const activityRows = await listByOrg("activity_events", orgId, {
    orderBy: [{ field: "createdAt", direction: "desc" }],
    limit: 8,
  });
  const taskRows = (await listByOrg("tasks", orgId))
    .filter((row) => asString(row.status) !== "complete")
    .sort((a, b) => {
      const rank = (priority: string) => (priority === "urgent" ? 0 : priority === "high" ? 1 : 2);
      const pr = rank(asString(a.priority)) - rank(asString(b.priority));
      if (pr !== 0) return pr;
      return asString(a.dueDate).localeCompare(asString(b.dueDate));
    })
    .slice(0, 8);

  return {
    kpis: {
      outstanding,
      overdue,
      dueThisWeek,
      activeTenders,
      posInProgress,
      documentsExpiring,
    },
    ageing,
    pipeline,
    tenderPipeline,
    invoiceStatus: [...invoiceStatusMap.entries()].map(([status, total]) => ({ status, total })),
    activity: activityRows.map((row) => ({
      id: asString(row.id),
      actorName: asString(row.actorName),
      summary: asString(row.summary),
      createdAt: asString(row.createdAt),
    })),
    tasks: taskRows.map((row) => ({
      id: asString(row.id),
      title: asString(row.title),
      description: asString(row.description),
      priority: asString(row.priority),
      dueDate: row.dueDate ? asString(row.dueDate) : null,
      status: asString(row.status),
    })),
    attention: await buildAttention(orgId, now),
  };
}

async function buildAttention(orgId: string, now: Date) {
  const items: { title: string; href: string; tone: "danger" | "warning" | "info" }[] = [];
  const invoices = await listByOrg("invoices", orgId);
  for (const invoice of invoices) {
    if (Number(moneyField(invoice.outstanding)) <= 0) continue;
    const days = daysOverdue(asString(invoice.dueDate), now);
    if (days > 0) {
      items.push({
        title: `Invoice ${asString(invoice.number)} is ${days} days overdue.`,
        href: `/app/invoices/${invoice.id}`,
        tone: "danger",
      });
    }
  }

  const pos = await listByOrg("purchase_orders", orgId);
  const grns = await listByOrg("goods_receipts", orgId);
  for (const po of pos) {
    if (!po.requiresGrn) continue;
    if (!["delivered", "awaiting_grn"].includes(asString(po.status))) continue;
    const hasSigned = grns.some(
      (grn) =>
        grn.purchaseOrderId === po.id &&
        !grn.deletedAt &&
        ["signed", "complete"].includes(asString(grn.status)),
    );
    if (!hasSigned) {
      items.push({
        title: `GRN missing for ${asString(po.number)}.`,
        href: `/app/purchase-orders/${po.id}`,
        tone: "warning",
      });
    }
  }

  const documents = await listByOrg("company_documents", orgId);
  for (const doc of documents) {
    if (!doc.expiryDate) continue;
    const remaining = daysUntil(asString(doc.expiryDate), now);
    if (remaining >= 0 && remaining <= 30) {
      items.push({
        title: `${asString(doc.name)} expires in ${remaining} days.`,
        href: "/app/vault",
        tone: remaining <= 7 ? "danger" : "warning",
      });
    }
  }

  const tenders = await listByOrg("tenders", orgId);
  for (const tender of tenders) {
    if (!tender.closingAt) continue;
    const hours = (new Date(asString(tender.closingAt)).getTime() - now.getTime()) / 36e5;
    if (hours > 0 && hours <= 48) {
      items.push({
        title: `${asString(tender.reference) || asString(tender.title)} closes in ${Math.round(hours)} hours.`,
        href: `/app/tenders/${tender.id}`,
        tone: "danger",
      });
    }
  }

  const requirements = await listByOrg("tender_requirements", orgId, { includeDeleted: true });
  const missingByTender = new Map<string, number>();
  for (const req of requirements) {
    if (!req.mandatory) continue;
    if (["complete", "not_applicable"].includes(asString(req.status))) continue;
    const tenderId = asString(req.tenderId);
    missingByTender.set(tenderId, (missingByTender.get(tenderId) ?? 0) + 1);
  }
  for (const [tenderId, cnt] of missingByTender) {
    const tender = tenders.find((row) => row.id === tenderId);
    items.push({
      title: `${cnt} mandatory document${cnt === 1 ? "" : "s"} missing from Tender ${asString(tender?.reference)}.`.trim(),
      href: `/app/tenders/${tenderId}`,
      tone: "danger",
    });
  }

  return items.slice(0, 8);
}

export async function listCustomers(orgId: string) {
  const customers = await listByOrg("customers", orgId, { orderBy: [{ field: "name", direction: "asc" }] });
  const invoices = await listByOrg("invoices", orgId);
  return customers.map((customer) => {
    const related = invoices.filter((invoice) => invoice.customerId === customer.id);
    const totalSales = related.reduce((sum, invoice) => addMoney(sum, moneyField(invoice.total)), "0");
    const outstanding = related.reduce((sum, invoice) => addMoney(sum, moneyField(invoice.outstanding)), "0");
    return { ...customer, totalSales, outstanding };
  });
}

export async function getCustomer(orgId: string, id: string) {
  const { getOrgDoc } = await import("@/lib/db/repo");
  return getOrgDoc("customers", orgId, id);
}

export { expiryStatus, calculateTenderReadiness };

export function refreshInvoiceOutstanding(total: string, withholding: string, deductions: string, paid: string) {
  return invoiceOutstanding({
    total,
    withholdingTax: withholding,
    otherDeductions: deductions,
    paidAmount: paid,
  });
}
