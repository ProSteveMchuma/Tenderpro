import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { formatMoney } from "@/lib/money";
import { ageingBucket, daysOverdue } from "@/lib/dates";
import { addMoney } from "@/lib/money";

export default async function ReceivablesPage() {
  const ctx = await requirePermission("receivables.read");
  const rows = await query<{
    id: string;
    number: string;
    customer: string | null;
    po: string | null;
    issue_date: string;
    due_date: string;
    total: string;
    outstanding: string;
    status: string;
    last_follow_up_at: string | null;
    next_action: string | null;
  }>(
    `select i.id, i.number, c.name as customer, po.number as po, i.issue_date::text, i.due_date::text,
            i.total::text, i.outstanding::text, i.status, i.last_follow_up_at::text, i.next_action
     from invoices i
     left join customers c on c.id=i.customer_id
     left join purchase_orders po on po.id=i.purchase_order_id
     where i.organization_id=$1 and i.deleted_at is null and i.outstanding::numeric > 0
     order by i.due_date`,
    [ctx.membership.organizationId],
  );
  const now = new Date();
  let total = "0";
  let overdue = "0";
  for (const row of rows) {
    total = addMoney(total, row.outstanding);
    if (daysOverdue(row.due_date, now) > 0) overdue = addMoney(overdue, row.outstanding);
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
              const days = daysOverdue(row.due_date, now) || 0;
              return (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2"><a className="font-medium hover:underline" href={`/app/invoices/${row.id}`}>{row.number}</a></td>
                  <td className="px-3 py-2">{row.customer}</td>
                  <td className="px-3 py-2">{row.po}</td>
                  <td className="px-3 py-2">{row.issue_date}</td>
                  <td className="px-3 py-2">{row.due_date}</td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(row.total, ctx.membership.currency)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(row.outstanding, ctx.membership.currency)}</td>
                  <td className="px-3 py-2">{days}</td>
                  <td className="px-3 py-2">{ageingBucket(days)}</td>
                  <td className="px-3 py-2"><StatusBadge value={row.status} /></td>
                  <td className="px-3 py-2">{row.next_action}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
