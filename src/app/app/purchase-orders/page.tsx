import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { ButtonLink } from "@/components/shared/button-link";
import { DataTable } from "@/components/shared/data-table";
import { formatMoney } from "@/lib/money";
import { canInvoicePurchaseOrder } from "@/lib/domain/invoice";

export default async function PurchaseOrdersPage() {
  const ctx = await requirePermission("purchase_orders.read");
  const rows = await query<{
    id: string;
    number: string;
    status: string;
    total: string;
    requires_grn: boolean;
    customer: string | null;
    has_grn: boolean;
  }>(
    `select po.id, po.number, po.status, po.total::text, po.requires_grn, c.name as customer,
            exists(select 1 from goods_receipts g where g.purchase_order_id=po.id and g.deleted_at is null and g.status in ('signed','complete')) as has_grn
     from purchase_orders po
     left join customers c on c.id = po.customer_id
     where po.organization_id=$1 and po.deleted_at is null
     order by po.created_at desc`,
    [ctx.membership.organizationId],
  );
  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Track each LPO from receipt through delivery, GRN and invoicing."
        action={<ButtonLink href="/app/purchase-orders/new">New PO</ButtonLink>}
      />
      <DataTable
        rows={rows}
        getHref={(row) => `/app/purchase-orders/${row.id}`}
        emptyTitle="No purchase orders"
        emptyDescription="Record an LPO when an award comes in."
        emptyHref="/app/purchase-orders/new"
        emptyAction="New PO"
        columns={[
          { key: "number", header: "PO", cell: (row) => <span className="font-medium">{row.number}</span> },
          { key: "customer", header: "Customer", cell: (row) => row.customer || "—" },
          {
            key: "value",
            header: "Value",
            align: "right",
            cell: (row) => <span className="tabular-nums">{formatMoney(row.total, ctx.membership.currency)}</span>,
          },
          { key: "status", header: "Status", cell: (row) => <StatusBadge value={row.status} /> },
          {
            key: "invoicing",
            header: "Invoicing",
            cell: (row) => {
              const gate = canInvoicePurchaseOrder({ requiresGrn: row.requires_grn, hasSignedGrn: row.has_grn });
              return gate.allowed ? (
                <StatusBadge value="ready" />
              ) : (
                <span className="text-xs text-amber-800 dark:text-amber-200">{gate.warning}</span>
              );
            },
          },
        ]}
      />
    </div>
  );
}
