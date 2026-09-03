import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { ButtonLink } from "@/components/shared/button-link";
import { DataTable } from "@/components/shared/data-table";

export default async function DeliveriesPage() {
  const ctx = await requirePermission("deliveries.read");
  const rows = await query<{
    id: string;
    number: string;
    status: string;
    delivery_date: string | null;
    customer: string | null;
    po: string | null;
  }>(
    `select d.id, d.number, d.status, d.delivery_date::text, c.name as customer, po.number as po
     from deliveries d
     left join customers c on c.id=d.customer_id
     left join purchase_orders po on po.id=d.purchase_order_id
     where d.organization_id=$1 and d.deleted_at is null order by d.created_at desc`,
    [ctx.membership.organizationId],
  );
  return (
    <div>
      <PageHeader
        title="Deliveries"
        description="Proof that goods moved. Needed before many GRNs can be signed."
        action={<ButtonLink href="/app/deliveries/new">Record delivery</ButtonLink>}
      />
      <DataTable
        rows={rows}
        emptyTitle="No deliveries yet"
        emptyDescription="Record a delivery against a purchase order."
        emptyHref="/app/deliveries/new"
        emptyAction="Record delivery"
        columns={[
          { key: "number", header: "Delivery", cell: (row) => <span className="font-medium">{row.number}</span> },
          { key: "customer", header: "Customer", cell: (row) => row.customer || "—" },
          { key: "po", header: "PO", cell: (row) => row.po || "—" },
          { key: "date", header: "Date", cell: (row) => row.delivery_date || "—" },
          { key: "status", header: "Status", cell: (row) => <StatusBadge value={row.status} /> },
        ]}
      />
    </div>
  );
}
