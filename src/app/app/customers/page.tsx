import Link from "next/link";
import { listByOrg } from "@/lib/db/repo";
import { asString, moneyString } from "@/lib/db/types";
import { requirePermission } from "@/lib/auth/session";
import { EmptyState, PageHeader } from "@/components/shared/chrome";
import { addMoney, formatMoney } from "@/lib/money";

export default async function CustomersPage() {
  const ctx = await requirePermission("customers.read");
  const orgId = ctx.membership.organizationId;
  const customers = await listByOrg("customers", orgId, { orderBy: [{ field: "name", direction: "asc" }] });
  const invoices = await listByOrg("invoices", orgId);
  const rows = customers.map((customer) => {
    const related = invoices.filter((invoice) => asString(invoice.customerId) === asString(customer.id));
    return {
      id: asString(customer.id),
      name: asString(customer.name),
      type: asString(customer.type),
      paymentTermsDays: Number(customer.paymentTermsDays ?? 0),
      totalSales: related.reduce((sum, invoice) => addMoney(sum, moneyString(invoice.total)), "0"),
      outstanding: related.reduce((sum, invoice) => addMoney(sum, moneyString(invoice.outstanding)), "0"),
    };
  });
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
                  <td className="px-3 py-2">{row.paymentTermsDays} days</td>
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
