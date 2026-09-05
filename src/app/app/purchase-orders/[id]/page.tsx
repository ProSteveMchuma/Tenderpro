import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { getOrgDoc, listByOrg } from "@/lib/db/repo";
import { asString, moneyString } from "@/lib/db/types";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { formatMoney } from "@/lib/money";
import { canInvoicePurchaseOrder, poLifecycleStage } from "@/lib/domain/invoice";

const STAGES = ["PO RECEIVED", "SOURCING", "DELIVERY", "GRN", "INVOICE", "PAYMENT"];

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePermission("purchase_orders.read");
  const orgId = ctx.membership.organizationId;
  const po = await getOrgDoc("purchase_orders", orgId, id);
  if (!po) notFound();
  const customer = po.customerId ? await getOrgDoc("customers", orgId, asString(po.customerId)) : null;
  const grn = (await listByOrg("goods_receipts", orgId, { where: [{ field: "purchaseOrderId", op: "==", value: id }] })).find((row) =>
    ["signed", "complete"].includes(asString(row.status)),
  );
  const gate = canInvoicePurchaseOrder({ requiresGrn: Boolean(po.requiresGrn), hasSignedGrn: Boolean(grn) });
  const current = poLifecycleStage(asString(po.status));
  const items = (await listByOrg("purchase_order_items", orgId, { where: [{ field: "purchaseOrderId", op: "==", value: id }] })).map((item) => ({
    description: asString(item.description),
    quantity: moneyString(item.quantity),
    total: moneyString(item.total),
  }));
  return (
    <div>
      <PageHeader title={asString(po.number)} description={asString(customer?.name)} />
      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-6">
        {STAGES.map((stage, index) => (
          <div
            key={stage}
            className={`rounded-lg border px-3 py-2 text-xs ${index === current ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
          >
            {stage}
          </div>
        ))}
      </div>
      {!gate.allowed ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <div className="font-semibold">⚠ Invoice blocked</div>
          <p className="text-sm">{gate.warning}</p>
        </div>
      ) : (
        <Link href={`/app/invoices/new?poId=${id}`} className="mb-6 inline-flex rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">
          Create invoice
        </Link>
      )}
      <div className="rounded-xl border bg-background p-4">
        <div className="flex items-center justify-between">
          <StatusBadge value={asString(po.status)} />
          <div className="font-semibold">{formatMoney(moneyString(po.total), asString(po.currency))}</div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{asString(po.paymentTermsText)}</p>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {items.map((item) => (
              <tr key={item.description} className="border-t">
                <td className="py-2">{item.description}</td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2 tabular-nums">{formatMoney(item.total, asString(po.currency))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
