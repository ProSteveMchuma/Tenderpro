import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db/client";
import { formatMoney } from "@/lib/money";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { daysOverdue } from "@/lib/dates";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePermission("customers.read");
  const customer = await queryOne<Record<string, string>>(
    `select * from customers where id=$1 and organization_id=$2 and deleted_at is null`,
    [id, ctx.membership.organizationId],
  );
  if (!customer) notFound();
  const invoices = await query<{ number: string; outstanding: string; due_date: string; status: string; total: string }>(
    `select number, outstanding::text, due_date::text, status, total::text from invoices where customer_id=$1 and organization_id=$2 and deleted_at is null`,
    [id, ctx.membership.organizationId],
  );
  const pos = await query<{ number: string; status: string; total: string }>(
    `select number, status, total::text from purchase_orders where customer_id=$1 and organization_id=$2 and deleted_at is null`,
    [id, ctx.membership.organizationId],
  );
  const tenders = await query<{ title: string; reference: string | null; status: string }>(
    `select title, reference, status from tenders where customer_id=$1 and organization_id=$2 and deleted_at is null`,
    [id, ctx.membership.organizationId],
  );
  const outstanding = invoices.reduce((sum, row) => sum + Number(row.outstanding), 0);
  const overdue = invoices.filter((row) => daysOverdue(row.due_date) > 0 && Number(row.outstanding) > 0);
  return (
    <div>
      <PageHeader title={customer.name} description={`${customer.type.replaceAll("_", " ")} · ${customer.industry || "No industry"}`} />
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Total sales" value={formatMoney(invoices.reduce((s, r) => s + Number(r.total), 0).toFixed(2), ctx.membership.currency)} />
        <Kpi label="Outstanding" value={formatMoney(outstanding.toFixed(2), ctx.membership.currency)} />
        <Kpi label="Overdue amount" value={formatMoney(overdue.reduce((s, r) => s + Number(r.outstanding), 0).toFixed(2), ctx.membership.currency)} />
        <Kpi label="Payment terms" value={`${customer.payment_terms_days} days`} />
      </div>
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Block title="Tenders">
          {tenders.map((row) => (
            <div key={row.reference || row.title} className="flex justify-between text-sm">
              <span>{row.reference || row.title}</span>
              <StatusBadge value={row.status} />
            </div>
          ))}
        </Block>
        <Block title="Purchase orders">
          {pos.map((row) => (
            <div key={row.number} className="flex justify-between text-sm">
              <span>{row.number}</span>
              <StatusBadge value={row.status} />
            </div>
          ))}
        </Block>
        <Block title="Invoices">
          {invoices.map((row) => (
            <div key={row.number} className="flex justify-between text-sm">
              <span>{row.number}</span>
              <StatusBadge value={row.status} />
            </div>
          ))}
        </Block>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <h2 className="mb-3 font-medium">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
