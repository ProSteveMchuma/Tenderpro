import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db/client";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { formatMoney } from "@/lib/money";
import { canInvoicePurchaseOrder, poLifecycleStage } from "@/lib/domain/invoice";

const STAGES = ["PO RECEIVED", "SOURCING", "DELIVERY", "GRN", "INVOICE", "PAYMENT"];

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePermission("purchase_orders.read");
  const po = await queryOne<Record<string, unknown>>(
    `select po.*, c.name as customer_name from purchase_orders po
     left join customers c on c.id = po.customer_id
     where po.id=$1 and po.organization_id=$2 and po.deleted_at is null`,
    [id, ctx.membership.organizationId],
  );
  if (!po) notFound();
  const grn = await queryOne(
    `select id from goods_receipts where purchase_order_id=$1 and organization_id=$2 and deleted_at is null and status in ('signed','complete')`,
    [id, ctx.membership.organizationId],
  );
  const gate = canInvoicePurchaseOrder({ requiresGrn: Boolean(po.requires_grn), hasSignedGrn: Boolean(grn) });
  const current = poLifecycleStage(String(po.status));
  const items = await query<{ description: string; quantity: string; unit_price: string; total: string }>(
    `select description, quantity::text, unit_price::text, total::text from purchase_order_items where purchase_order_id=$1`,
    [id],
  );
  return (
    <div>
      <PageHeader title={String(po.number)} description={String(po.customer_name || "")} />
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
          <StatusBadge value={String(po.status)} />
          <div className="font-semibold">{formatMoney(String(po.total), String(po.currency))}</div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{String(po.payment_terms_text || "")}</p>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {items.map((item) => (
              <tr key={item.description} className="border-t">
                <td className="py-2">{item.description}</td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2 tabular-nums">{formatMoney(item.total, String(po.currency))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
