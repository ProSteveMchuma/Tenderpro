import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db/client";
import { AlertBanner, PageHeader, Panel, StatusBadge } from "@/components/shared/chrome";
import { ButtonLink } from "@/components/shared/button-link";
import { formatMoney } from "@/lib/money";
import { canInvoicePurchaseOrder, poLifecycleStage } from "@/lib/domain/invoice";
import { cn } from "@/lib/utils";

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
      <PageHeader
        eyebrow="Purchase order"
        title={String(po.number)}
        description={String(po.customer_name || "")}
        action={<StatusBadge value={String(po.status)} />}
      />
      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-6">
        {STAGES.map((stage, index) => (
          <div
            key={stage}
            className={cn(
              "rounded-lg border px-3 py-2 text-[11px] font-semibold tracking-wide",
              index === current
                ? "border-primary bg-primary text-primary-foreground"
                : index < current
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                  : "bg-card text-muted-foreground",
            )}
          >
            {stage}
          </div>
        ))}
      </div>
      {!gate.allowed ? (
        <div className="mb-6">
          <AlertBanner tone="warning" title="Invoice blocked">
            {gate.warning}
          </AlertBanner>
        </div>
      ) : (
        <div className="mb-6">
          <ButtonLink href={`/app/invoices/new?poId=${id}`}>Create invoice</ButtonLink>
        </div>
      )}
      <Panel className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Order total</div>
          <div className="text-xl font-semibold tabular-nums">{formatMoney(String(po.total), String(po.currency))}</div>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{String(po.payment_terms_text || "")}</p>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.description} className="border-b last:border-0">
                <td className="py-2.5">{item.description}</td>
                <td className="py-2.5 tabular-nums">{item.quantity}</td>
                <td className="py-2.5 text-right tabular-nums">{formatMoney(item.total, String(po.currency))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
