import { createGrnAction } from "@/app/actions/records";
import { requirePermission } from "@/lib/auth/session";
import { listByOrg } from "@/lib/db/repo";
import { asString } from "@/lib/db/types";
import { PageHeader } from "@/components/shared/chrome";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export default async function NewGrnPage() {
  const ctx = await requirePermission("grns.write");
  const orgId = ctx.membership.organizationId;
  const customers = (await listByOrg("customers", orgId)).map((c) => ({ id: asString(c.id), name: asString(c.name) }));
  const pos = (await listByOrg("purchase_orders", orgId)).map((p) => ({ id: asString(p.id), number: asString(p.number) }));
  const deliveries = (await listByOrg("deliveries", orgId)).map((d) => ({ id: asString(d.id), number: asString(d.number) }));
  return (
    <div className="max-w-xl">
      <PageHeader title="Record GRN" />
      <form action={createGrnAction} className="rounded-xl border bg-background p-6">
        <Field label="GRN number" name="number" />
        <Field label="Customer"><select name="customerId" className="h-9 w-full rounded-lg border px-3 text-sm">{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Purchase order"><select name="purchaseOrderId" className="h-9 w-full rounded-lg border px-3 text-sm">{pos.map((p) => <option key={p.id} value={p.id}>{p.number}</option>)}</select></Field>
        <Field label="Delivery"><select name="deliveryId" className="h-9 w-full rounded-lg border px-3 text-sm"><option value="">None</option>{deliveries.map((d) => <option key={d.id} value={d.id}>{d.number}</option>)}</select></Field>
        <Field label="GRN date" name="grnDate" type="date" />
        <input type="hidden" name="status" value="signed" />
        <label className="mb-4 block text-sm"><span className="mb-1 block font-medium">Signed GRN file</span><input type="file" name="file" className="block w-full text-sm" /></label>
        <Button type="submit">Save signed GRN</Button>
      </form>
    </div>
  );
}
