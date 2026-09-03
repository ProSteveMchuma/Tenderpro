import { query, queryOne } from "@/lib/db/client";
import { AuthContext } from "@/lib/auth/session";
import { addMoney, moneyString } from "@/lib/money";
import { ageingBucket, daysOverdue, daysUntil, expiryStatus } from "@/lib/dates";
import { calculateTenderReadiness } from "@/lib/domain/tender-readiness";
import { invoiceOutstanding } from "@/lib/domain/invoice";

export async function logActivity(
  ctx: AuthContext,
  input: { entityType: string; entityId?: string | null; action: string; summary: string },
) {
  await query(
    `insert into activity_events (id, organization_id, actor_id, actor_name, entity_type, entity_id, action, summary)
     values (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7)`,
    [
      ctx.membership.organizationId,
      ctx.user.id,
      ctx.user.fullName,
      input.entityType,
      input.entityId ?? null,
      input.action,
      input.summary,
    ],
  );
}

export async function notify(
  ctx: AuthContext,
  input: { type: string; title: string; body: string; entityType?: string; entityId?: string },
) {
  await query(
    `insert into notifications (id, organization_id, user_id, type, title, body, entity_type, entity_id)
     values (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7)`,
    [
      ctx.membership.organizationId,
      ctx.user.id,
      input.type,
      input.title,
      input.body,
      input.entityType ?? null,
      input.entityId ?? null,
    ],
  );
}

export async function nextNumber(organizationId: string, kind: string, prefix: string) {
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
  const invoices = await query<{
    id: string;
    number: string;
    due_date: string;
    outstanding: string;
    status: string;
    customer_id: string;
  }>(
    `select id, number, due_date::text, outstanding::text, status, customer_id
     from invoices where organization_id = $1 and deleted_at is null`,
    [orgId],
  );

  const now = new Date();
  let outstanding = "0";
  let overdue = "0";
  let dueThisWeek = "0";
  const ageing = { "0-30": "0", "31-60": "0", "61-90": "0", "90+": "0" };

  for (const invoice of invoices) {
    const amount = moneyString(invoice.outstanding);
    outstanding = addMoney(outstanding, amount);
    const overdueDays = daysOverdue(invoice.due_date, now);
    if (overdueDays > 0 && amount !== "0.00") {
      overdue = addMoney(overdue, amount);
      const bucket = ageingBucket(overdueDays);
      ageing[bucket] = addMoney(ageing[bucket], amount);
    } else if (amount !== "0.00") {
      ageing["0-30"] = addMoney(ageing["0-30"], amount);
      const until = daysUntil(invoice.due_date, now);
      if (until <= 7) dueThisWeek = addMoney(dueThisWeek, amount);
    }
  }

  const [tenders] = await query<{ count: number }>(
    `select count(*)::int as count from tenders
     where organization_id = $1 and deleted_at is null and status not in ('lost','cancelled','awarded')`,
    [orgId],
  );
  const [pos] = await query<{ count: number }>(
    `select count(*)::int as count from purchase_orders
     where organization_id = $1 and deleted_at is null and status not in ('closed','cancelled','invoiced')`,
    [orgId],
  );
  const [expiring] = await query<{ count: number }>(
    `select count(*)::int as count from company_documents
     where organization_id = $1 and deleted_at is null and expiry_date is not null
       and expiry_date <= (current_date + 30) and expiry_date >= current_date`,
    [orgId],
  );

  const pipeline = await queryOne<{ value: string }>(
    `select coalesce(sum(estimated_value),0)::text as value from opportunities
     where organization_id = $1 and deleted_at is null and stage not in ('lost','cancelled')`,
    [orgId],
  );
  const tenderPipeline = await queryOne<{ value: string }>(
    `select coalesce(sum(tender_value),0)::text as value from tenders
     where organization_id = $1 and deleted_at is null and status not in ('lost','cancelled')`,
    [orgId],
  );
  const invoiceStatus = await query<{ status: string; total: string }>(
    `select status, coalesce(sum(total),0)::text as total
     from invoices where organization_id = $1 and deleted_at is null
     group by status`,
    [orgId],
  );
  const activity = await query(
    `select id, actor_name as "actorName", summary, created_at as "createdAt"
     from activity_events where organization_id = $1 order by created_at desc limit 8`,
    [orgId],
  );
  const tasks = await query(
    `select id, title, description, priority, due_date as "dueDate", status
     from tasks where organization_id = $1 and deleted_at is null and status != 'complete'
     order by case priority when 'urgent' then 0 when 'high' then 1 else 2 end, due_date asc
     limit 8`,
    [orgId],
  );
  const attention = await buildAttention(orgId, now);

  return {
    kpis: {
      outstanding,
      overdue,
      dueThisWeek,
      activeTenders: tenders?.count ?? 0,
      posInProgress: pos?.count ?? 0,
      documentsExpiring: expiring?.count ?? 0,
    },
    ageing,
    pipeline: pipeline?.value ?? "0",
    tenderPipeline: tenderPipeline?.value ?? "0",
    invoiceStatus,
    activity,
    tasks,
    attention,
  };
}

async function buildAttention(orgId: string, now: Date) {
  const items: { title: string; href: string; tone: "danger" | "warning" | "info" }[] = [];
  const overdueInvoices = await query<{ id: string; number: string; due_date: string; outstanding: string }>(
    `select id, number, due_date::text, outstanding::text from invoices
     where organization_id = $1 and deleted_at is null and outstanding::numeric > 0`,
    [orgId],
  );
  for (const invoice of overdueInvoices) {
    const days = daysOverdue(invoice.due_date, now);
    if (days > 0) {
      items.push({
        title: `Invoice ${invoice.number} is ${days} days overdue.`,
        href: `/app/invoices/${invoice.id}`,
        tone: "danger",
      });
    }
  }
  const missingGrn = await query<{ id: string; number: string }>(
    `select po.id, po.number from purchase_orders po
     where po.organization_id = $1 and po.deleted_at is null and po.requires_grn = true
       and po.status in ('delivered','awaiting_grn')
       and not exists (
         select 1 from goods_receipts g
         where g.purchase_order_id = po.id and g.deleted_at is null and g.status in ('signed','complete')
       )`,
    [orgId],
  );
  for (const po of missingGrn) {
    items.push({
      title: `GRN missing for ${po.number}.`,
      href: `/app/purchase-orders/${po.id}`,
      tone: "warning",
    });
  }
  const docs = await query<{ name: string; expiry_date: string }>(
    `select name, expiry_date::text from company_documents
     where organization_id = $1 and deleted_at is null and expiry_date is not null`,
    [orgId],
  );
  for (const doc of docs) {
    const remaining = daysUntil(doc.expiry_date, now);
    if (remaining >= 0 && remaining <= 30) {
      items.push({
        title: `${doc.name} expires in ${remaining} days.`,
        href: "/app/vault",
        tone: remaining <= 7 ? "danger" : "warning",
      });
    }
  }
  const tenders = await query<{ id: string; title: string; reference: string | null; closing_at: string | null }>(
    `select id, title, reference, closing_at::text from tenders
     where organization_id = $1 and deleted_at is null and closing_at is not null`,
    [orgId],
  );
  for (const tender of tenders) {
    if (!tender.closing_at) continue;
    const hours = (new Date(tender.closing_at).getTime() - now.getTime()) / 36e5;
    if (hours > 0 && hours <= 48) {
      items.push({
        title: `${tender.reference ?? tender.title} closes in ${Math.round(hours)} hours.`,
        href: `/app/tenders/${tender.id}`,
        tone: "danger",
      });
    }
  }
  const reqs = await query<{ tender_id: string; reference: string | null; cnt: number }>(
    `select t.id as tender_id, t.reference, count(*)::int as cnt
     from tender_requirements r
     join tenders t on t.id = r.tender_id
     where r.organization_id = $1 and r.mandatory = true and r.status not in ('complete','not_applicable')
     group by t.id, t.reference`,
    [orgId],
  );
  for (const row of reqs) {
    items.push({
      title: `${row.cnt} mandatory document${row.cnt === 1 ? "" : "s"} missing from Tender ${row.reference ?? ""}.`.trim(),
      href: `/app/tenders/${row.tender_id}`,
      tone: "danger",
    });
  }
  return items.slice(0, 8);
}

export async function listCustomers(orgId: string) {
  return query(
    `select c.*, 
      coalesce((select sum(total) from invoices i where i.customer_id = c.id and i.deleted_at is null),0)::text as "totalSales",
      coalesce((select sum(outstanding) from invoices i where i.customer_id = c.id and i.deleted_at is null),0)::text as "outstanding"
     from customers c
     where c.organization_id = $1 and c.deleted_at is null
     order by c.name`,
    [orgId],
  );
}

export async function getCustomer(orgId: string, id: string) {
  return queryOne(`select * from customers where id = $1 and organization_id = $2 and deleted_at is null`, [
    id,
    orgId,
  ]);
}

export async function listByOrg<T extends Record<string, unknown>>(
  table: string,
  orgId: string,
  orderBy = "created_at desc",
) {
  return query<T>(
    `select * from ${table} where organization_id = $1 and (deleted_at is null or deleted_at is not null) and coalesce(deleted_at, now()) = coalesce(deleted_at, now()) and (deleted_at is null) order by ${orderBy}`,
    [orgId],
  );
}

export function refreshInvoiceOutstanding(total: string, withholding: string, deductions: string, paid: string) {
  return invoiceOutstanding({
    total,
    withholdingTax: withholding,
    otherDeductions: deductions,
    paidAmount: paid,
  });
}

export { expiryStatus, calculateTenderReadiness };
