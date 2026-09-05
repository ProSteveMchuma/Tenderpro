import Link from "next/link";
import { listByOrg } from "@/lib/db/repo";
import { asString, moneyString } from "@/lib/db/types";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { formatMoney } from "@/lib/money";
import { daysOverdue } from "@/lib/dates";

export default async function InvoicesPage() {
  const ctx = await requirePermission("invoices.read");
  const orgId = ctx.membership.organizationId;
  const invoices = await listByOrg("invoices", orgId, { orderBy: [{ field: "dueDate", direction: "asc" }] });
  const customers = await listByOrg("customers", orgId);
  const customerById = new Map(customers.map((row) => [asString(row.id), asString(row.name)]));
  const rows = invoices.map((invoice) => ({
    id: asString(invoice.id),
    number: asString(invoice.number),
    status: asString(invoice.status),
    outstanding: moneyString(invoice.outstanding),
    dueDate: asString(invoice.dueDate),
    customer: customerById.get(asString(invoice.customerId)) ?? null,
  }));
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
                <td className="px-3 py-2">{row.dueDate}{daysOverdue(row.dueDate) > 0 ? ` · ${daysOverdue(row.dueDate)}d overdue` : ""}</td>
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
