import { createPurchaseOrderAction } from "@/app/actions/records";
import { requirePermission } from "@/lib/auth/session";
import { query } from "@/lib/db/client";
import { PageHeader } from "@/components/shared/chrome";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export default async function NewPurchaseOrderPage() {
  const ctx = await requirePermission("purchase_orders.write");
  const customers = await query<{ id: string; name: string }>(
    "select id, name from customers where organization_id=$1 and deleted_at is null order by name",
    [ctx.membership.organizationId],
  );
  return (
    <div className="max-w-xl">
      <PageHeader title="New purchase order" description="Create manually or upload a PO PDF for AI extraction." />
      <form action={createPurchaseOrderAction} className="rounded-xl border border-border/80 bg-card p-6 shadow-xs">
        <Field label="PO number" name="number" />
        <Field label="Customer">
          <select name="customerId" className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
            <option value="">Select customer</option>
            {customers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Issue date" name="issueDate" type="date" />
        <Field label="Payment terms (days)" name="paymentTermsDays" defaultValue="30" />
        <Field label="Payment terms text" name="paymentTermsText" />
        <Field label="Delivery location" name="deliveryLocation" />
        <Field label="Delivery deadline" name="deliveryDeadline" type="date" />
        <Field label="Contact person" name="contactPerson" />
        <Field label="Total" name="total" />
        <Field label="Tax" name="tax" />
        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-medium">Upload PO document</span>
          <input type="file" name="file" className="block w-full text-sm" />
        </label>
        <Button type="submit">Save PO</Button>
      </form>
    </div>
  );
}
