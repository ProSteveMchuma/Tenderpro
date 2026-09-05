import { listByOrg } from "@/lib/db/repo";
import { asString, moneyString } from "@/lib/db/types";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { formatMoney } from "@/lib/money";
import { ageingBucket, daysOverdue } from "@/lib/dates";
import { addMoney } from "@/lib/money";

export default async function ReceivablesPage() {
  const ctx = await requirePermission("receivables.read");
  const orgId = ctx.membership.organizationId;
  const invoices = await listByOrg("invoices", orgId, { orderBy: [{ field: "dueDate", direction: "asc" }] });
  const customers = await listByOrg("customers", orgId);
  const pos = await listByOrg("purchase_orders", orgId);
  const customerById = new Map(customers.map((row) => [asString(row.id), asString(row.name)]));
  const poById = new Map(pos.map((row) => [asString(row.id), asString(row.number)]));
  const rows = invoices
    .filter((invoice) => Number(moneyString(invoice.outstanding)) > 0)
    .map((invoice) => ({
      id: asString(invoice.id),
      number: asString(invoice.number),
      customer: customerById.get(asString(invoice.customerId)) ?? null,
      po: invoice.purchaseOrderId ? poById.get(asString(invoice.purchaseOrderId)) ?? null : null,
      issueDate: asString(invoice.issueDate),
      dueDate: asString(invoice.dueDate),
      total: moneyString(invoice.total),
      outstanding: moneyString(invoice.outstanding),
      status: asString(invoice.status),
      nextAction: invoice.nextAction ? asString(invoice.nextAction) : null,
    }));
  const now = new Date();
  let total = "0";
  let overdue = "0";
  for (const row of rows) {
    total = addMoney(total, row.outstanding);
    if (daysOverdue(row.dueDate, now) > 0) overdue = addMoney(overdue, row.outstanding);
  }
  return (
    <div>
      <PageHeader title="Receivables" description="Cash still to collect. The operating metric that matters." />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">Total outstanding</div><div className="text-xl font-semibold">{formatMoney(total, ctx.membership.currency)}</div></div>
        <div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">Overdue</div><div className="text-xl font-semibold">{formatMoney(overdue, ctx.membership.currency)}</div></div>
        <div className="rounded-xl border p-4"><div className="text-xs text-muted-foreground">Invoices</div><div className="text-xl font-semibold">{rows.length}</div></div>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              {["Invoice","Customer","PO","Invoice date","Due","Amount","Outstanding","Days","Age","Status","Next action"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const days = daysOverdue(row.dueDate, now) || 0;
              return (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2"><a className="font-medium hover:underline" href={`/app/invoices/${row.id}`}>{row.number}</a></td>
                  <td className="px-3 py-2">{row.customer}</td>
                  <td className="px-3 py-2">{row.po}</td>
                  <td className="px-3 py-2">{row.issueDate}</td>
                  <td className="px-3 py-2">{row.dueDate}</td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(row.total, ctx.membership.currency)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(row.outstanding, ctx.membership.currency)}</td>
                  <td className="px-3 py-2">{days}</td>
                  <td className="px-3 py-2">{ageingBucket(days)}</td>
                  <td className="px-3 py-2"><StatusBadge value={row.status} /></td>
                  <td className="px-3 py-2">{row.nextAction}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
