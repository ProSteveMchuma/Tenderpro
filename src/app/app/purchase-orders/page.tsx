import Link from "next/link";
import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
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
        action={
          <Link href="/app/purchase-orders/new" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">
            New PO
          </Link>
        }
      />
      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2">PO</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Value</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Invoicing</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const gate = canInvoicePurchaseOrder({ requiresGrn: row.requires_grn, hasSignedGrn: row.has_grn });
              return (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link className="font-medium hover:underline" href={`/app/purchase-orders/${row.id}`}>
                      {row.number}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.customer}</td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(row.total, ctx.membership.currency)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge value={row.status} />
                  </td>
                  <td className="px-3 py-2 text-xs">{gate.allowed ? "Ready" : gate.warning}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
