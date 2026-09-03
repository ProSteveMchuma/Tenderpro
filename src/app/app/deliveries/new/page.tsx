import { createDeliveryAction } from "@/app/actions/records";
import { requirePermission } from "@/lib/auth/session";
import { query } from "@/lib/db/client";
import { PageHeader } from "@/components/shared/chrome";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { DELIVERY_STATUSES } from "@/lib/constants";

export default async function NewDeliveryPage() {
  const ctx = await requirePermission("deliveries.write");
  const customers = await query<{ id: string; name: string }>("select id, name from customers where organization_id=$1 and deleted_at is null", [ctx.membership.organizationId]);
  const pos = await query<{ id: string; number: string }>("select id, number from purchase_orders where organization_id=$1 and deleted_at is null", [ctx.membership.organizationId]);
  return (
    <div className="max-w-xl">
      <PageHeader title="Record delivery" />
      <form action={createDeliveryAction} className="rounded-xl border bg-background p-6">
        <Field label="Delivery number" name="number" />
        <Field label="Customer">
          <select name="customerId" className="h-9 w-full rounded-lg border px-3 text-sm">{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </Field>
        <Field label="Purchase order">
          <select name="purchaseOrderId" className="h-9 w-full rounded-lg border px-3 text-sm">{pos.map((p) => <option key={p.id} value={p.id}>{p.number}</option>)}</select>
        </Field>
        <Field label="Delivery date" name="deliveryDate" type="date" />
        <Field label="Location" name="location" />
        <Field label="Delivered by" name="deliveredBy" />
        <Field label="Received by" name="receivedBy" />
        <Field label="Status">
          <select name="status" className="h-9 w-full rounded-lg border px-3 text-sm">{DELIVERY_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </Field>
        <Field label="Notes" name="notes" />
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
}
