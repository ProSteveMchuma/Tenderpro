import Link from "next/link";
import { listByOrg } from "@/lib/db/repo";
import { asString, moneyString } from "@/lib/db/types";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { formatMoney } from "@/lib/money";
import { canInvoicePurchaseOrder } from "@/lib/domain/invoice";

export default async function PurchaseOrdersPage() {
  const ctx = await requirePermission("purchase_orders.read");
  const orgId = ctx.membership.organizationId;
  const pos = await listByOrg("purchase_orders", orgId, { orderBy: [{ field: "createdAt", direction: "desc" }] });
  const customers = await listByOrg("customers", orgId);
  const grns = await listByOrg("goods_receipts", orgId);
  const customerById = new Map(customers.map((row) => [asString(row.id), asString(row.name)]));
  const rows = pos.map((po) => {
    const hasGrn = grns.some(
      (grn) => asString(grn.purchaseOrderId) === asString(po.id) && ["signed", "complete"].includes(asString(grn.status)),
    );
    return {
      id: asString(po.id),
      number: asString(po.number),
      status: asString(po.status),
      total: moneyString(po.total),
      requiresGrn: Boolean(po.requiresGrn),
      customer: customerById.get(asString(po.customerId)) ?? null,
      hasGrn,
    };
  });
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
              const gate = canInvoicePurchaseOrder({ requiresGrn: row.requiresGrn, hasSignedGrn: row.hasGrn });
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
