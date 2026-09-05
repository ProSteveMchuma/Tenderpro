import { createInvoiceAction } from "@/app/actions/records";
import { requirePermission } from "@/lib/auth/session";
import { getOrgDoc, listByOrg } from "@/lib/db/repo";
import { asString } from "@/lib/db/types";
import { PageHeader } from "@/components/shared/chrome";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { canInvoicePurchaseOrder } from "@/lib/domain/invoice";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ poId?: string }> }) {
  const ctx = await requirePermission("invoices.write");
  const { poId } = await searchParams;
  const orgId = ctx.membership.organizationId;
  const customers = (await listByOrg("customers", orgId)).map((c) => ({
    id: asString(c.id),
    name: asString(c.name),
    paymentTermsDays: Number(c.paymentTermsDays ?? 0),
  }));
  const pos = (await listByOrg("purchase_orders", orgId)).map((p) => ({ id: asString(p.id), number: asString(p.number) }));
  const selectedPo = poId ? await getOrgDoc("purchase_orders", orgId, poId) : null;
  const grn = poId
    ? (await listByOrg("goods_receipts", orgId, { where: [{ field: "purchaseOrderId", op: "==", value: poId }] })).find((row) =>
        ["signed", "complete"].includes(asString(row.status)),
      )
    : null;
  const gate = selectedPo ? canInvoicePurchaseOrder({ requiresGrn: Boolean(selectedPo.requiresGrn), hasSignedGrn: Boolean(grn) }) : { allowed: true, warning: null };
  return (
    <div className="max-w-xl">
      <PageHeader title="Create invoice" />
      {!gate.allowed ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-950">{gate.warning}</div> : null}
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
