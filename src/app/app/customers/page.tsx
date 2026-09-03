import Link from "next/link";
import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { EmptyState, PageHeader } from "@/components/shared/chrome";
import { formatMoney } from "@/lib/money";

export default async function CustomersPage() {
  const ctx = await requirePermission("customers.read");
  const rows = await query<{
    id: string;
    name: string;
    type: string;
    payment_terms_days: number;
    totalSales: string;
    outstanding: string;
  }>(
    `select c.id, c.name, c.type, c.payment_terms_days,
            coalesce((select sum(total) from invoices i where i.customer_id=c.id and i.deleted_at is null),0)::text as "totalSales",
            coalesce((select sum(outstanding) from invoices i where i.customer_id=c.id and i.deleted_at is null),0)::text as outstanding
     from customers c where c.organization_id=$1 and c.deleted_at is null order by c.name`,
    [ctx.membership.organizationId],
  );
  return (
    <div>
      <PageHeader
        title="Customers"
        description="Buyers you supply — governments, corporates, NGOs and more."
        action={
          <Link href="/app/customers/new" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">
            Add customer
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState title="No customers yet" description="Add the procuring entities you sell to." href="/app/customers/new" actionLabel="Add customer" />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Organization</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Terms</th>
                <th className="px-3 py-2 font-medium">Sales</th>
                <th className="px-3 py-2 font-medium">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link href={`/app/customers/${row.id}`} className="font-medium hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 capitalize">{row.type.replaceAll("_", " ")}</td>
                  <td className="px-3 py-2">{row.payment_terms_days} days</td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(row.totalSales, ctx.membership.currency)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(row.outstanding, ctx.membership.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
