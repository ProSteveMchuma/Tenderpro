import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getOrgDoc, listByOrg } from "@/lib/db/repo";
import { asString, moneyString } from "@/lib/db/types";
import { formatMoney } from "@/lib/money";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { daysOverdue } from "@/lib/dates";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePermission("customers.read");
  const orgId = ctx.membership.organizationId;
  const customer = await getOrgDoc("customers", orgId, id);
  if (!customer) notFound();
  const invoices = (await listByOrg("invoices", orgId)).filter((row) => asString(row.customerId) === id);
  const pos = (await listByOrg("purchase_orders", orgId)).filter((row) => asString(row.customerId) === id);
  const tenders = (await listByOrg("tenders", orgId)).filter((row) => asString(row.customerId) === id);
  const outstanding = invoices.reduce((sum, row) => sum + Number(moneyString(row.outstanding)), 0);
  const overdue = invoices.filter((row) => daysOverdue(asString(row.dueDate)) > 0 && Number(moneyString(row.outstanding)) > 0);
  return (
    <div>
      <PageHeader title={asString(customer.name)} description={`${asString(customer.type).replaceAll("_", " ")} · ${asString(customer.industry) || "No industry"}`} />
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Total sales" value={formatMoney(invoices.reduce((s, r) => s + Number(moneyString(r.total)), 0).toFixed(2), ctx.membership.currency)} />
        <Kpi label="Outstanding" value={formatMoney(outstanding.toFixed(2), ctx.membership.currency)} />
        <Kpi label="Overdue amount" value={formatMoney(overdue.reduce((s, r) => s + Number(moneyString(r.outstanding)), 0).toFixed(2), ctx.membership.currency)} />
        <Kpi label="Payment terms" value={`${Number(customer.paymentTermsDays ?? 0)} days`} />
      </div>
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Block title="Tenders">
          {tenders.map((row) => (
            <div key={asString(row.reference) || asString(row.title)} className="flex justify-between text-sm">
              <span>{asString(row.reference) || asString(row.title)}</span>
              <StatusBadge value={asString(row.status)} />
            </div>
          ))}
        </Block>
        <Block title="Purchase orders">
          {pos.map((row) => (
            <div key={asString(row.number)} className="flex justify-between text-sm">
              <span>{asString(row.number)}</span>
              <StatusBadge value={asString(row.status)} />
            </div>
          ))}
        </Block>
        <Block title="Invoices">
          {invoices.map((row) => (
            <div key={asString(row.number)} className="flex justify-between text-sm">
              <span>{asString(row.number)}</span>
              <StatusBadge value={asString(row.status)} />
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
