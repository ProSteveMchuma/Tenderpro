import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { EmptyState, PageHeader } from "@/components/shared/chrome";
import { ButtonLink } from "@/components/shared/button-link";
import { DataTable } from "@/components/shared/data-table";
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
        action={<ButtonLink href="/app/customers/new">Add customer</ButtonLink>}
      />
      {rows.length === 0 ? (
        <EmptyState title="No customers yet" description="Add the procuring entities you sell to." href="/app/customers/new" actionLabel="Add customer" />
      ) : (
        <DataTable
          rows={rows}
          getHref={(row) => `/app/customers/${row.id}`}
          columns={[
            { key: "name", header: "Organization", cell: (row) => <span className="font-medium">{row.name}</span> },
            { key: "type", header: "Type", cell: (row) => <span className="capitalize">{row.type.replaceAll("_", " ")}</span> },
            { key: "terms", header: "Terms", cell: (row) => `${row.payment_terms_days} days` },
            {
              key: "sales",
              header: "Sales",
              align: "right",
              cell: (row) => <span className="tabular-nums">{formatMoney(row.totalSales, ctx.membership.currency)}</span>,
            },
            {
              key: "outstanding",
              header: "Outstanding",
              align: "right",
              cell: (row) => <span className="tabular-nums">{formatMoney(row.outstanding, ctx.membership.currency)}</span>,
            },
          ]}
        />
      )}
    </div>
  );
}
