import Link from "next/link";
import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { formatMoney } from "@/lib/money";
import { daysOverdue } from "@/lib/dates";

export default async function InvoicesPage() {
  const ctx = await requirePermission("invoices.read");
  const rows = await query<{ id: string; number: string; status: string; total: string; outstanding: string; due_date: string; customer: string | null }>(
    `select i.id, i.number, i.status, i.total::text, i.outstanding::text, i.due_date::text, c.name as customer
     from invoices i left join customers c on c.id=i.customer_id
     where i.organization_id=$1 and i.deleted_at is null order by i.due_date`,
    [ctx.membership.organizationId],
  );
  return (
    <div>
      <PageHeader title="Invoices" action={<Link className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground" href="/app/invoices/new">Create invoice</Link>} />
      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="px-3 py-2">Invoice</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Due</th><th className="px-3 py-2">Outstanding</th><th className="px-3 py-2">Status</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2"><Link className="font-medium hover:underline" href={`/app/invoices/${row.id}`}>{row.number}</Link></td>
                <td className="px-3 py-2">{row.customer}</td>
                <td className="px-3 py-2">{row.due_date}{daysOverdue(row.due_date) > 0 ? ` · ${daysOverdue(row.due_date)}d overdue` : ""}</td>
                <td className="px-3 py-2 tabular-nums">{formatMoney(row.outstanding, ctx.membership.currency)}</td>
                <td className="px-3 py-2"><StatusBadge value={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
