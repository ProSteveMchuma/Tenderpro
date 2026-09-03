import { createInvoiceAction } from "@/app/actions/records";
import { requirePermission } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db/client";
import { AlertBanner, PageHeader } from "@/components/shared/chrome";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { canInvoicePurchaseOrder } from "@/lib/domain/invoice";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ poId?: string }> }) {
  const ctx = await requirePermission("invoices.write");
  const { poId } = await searchParams;
  const customers = await query<{ id: string; name: string; payment_terms_days: number }>("select id, name, payment_terms_days from customers where organization_id=$1 and deleted_at is null", [ctx.membership.organizationId]);
  const pos = await query<{ id: string; number: string }>("select id, number from purchase_orders where organization_id=$1 and deleted_at is null", [ctx.membership.organizationId]);
  const selectedPo = poId
    ? await queryOne<{ requires_grn: boolean }>("select requires_grn from purchase_orders where id=$1 and organization_id=$2", [poId, ctx.membership.organizationId])
    : null;
  const grn = poId
    ? await queryOne("select id from goods_receipts where purchase_order_id=$1 and organization_id=$2 and status in ('signed','complete')", [poId, ctx.membership.organizationId])
    : null;
  const gate = selectedPo ? canInvoicePurchaseOrder({ requiresGrn: selectedPo.requires_grn, hasSignedGrn: Boolean(grn) }) : { allowed: true, warning: null };
  return (
    <div className="max-w-xl">
      <PageHeader title="Create invoice" />
      {!gate.allowed ? (
        <div className="mb-4">
          <AlertBanner tone="danger" title="Invoice blocked">
            {gate.warning}
          </AlertBanner>
        </div>
      ) : null}
      <form action={createInvoiceAction} className="rounded-xl border bg-background p-6">
        <Field label="Invoice number" name="number" />
        <Field label="Customer"><select name="customerId" className="h-9 w-full rounded-lg border px-3 text-sm">{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Purchase order"><select name="purchaseOrderId" defaultValue={poId || ""} className="h-9 w-full rounded-lg border px-3 text-sm"><option value="">None</option>{pos.map((p) => <option key={p.id} value={p.id}>{p.number}</option>)}</select></Field>
        <Field label="Issue date" name="issueDate" type="date" />
        <Field label="Payment terms (days)" name="paymentTermsDays" defaultValue="30" />
        <Field label="Subtotal" name="subtotal" required />
        <Field label="VAT" name="vat" />
        <Field label="Withholding tax" name="withholdingTax" defaultValue="0" />
        <Field label="eTIMS reference" name="etimsReference" />
        <Button type="submit" disabled={!gate.allowed}>Save invoice</Button>
      </form>
    </div>
  );
}
