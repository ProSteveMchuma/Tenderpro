import { createCustomerAction } from "@/app/actions/records";
import { PageHeader } from "@/components/shared/chrome";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { CUSTOMER_TYPES } from "@/lib/constants";

export default function NewCustomerPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="Add customer" description="Track every buyer you supply." />
      <form action={createCustomerAction} className="rounded-xl border bg-background p-6">
        <Field label="Organization name" name="name" required />
        <Field label="Type">
          <select name="type" className="h-9 w-full rounded-lg border px-3 text-sm">
            {CUSTOMER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Industry" name="industry" />
        <Field label="Tax / PIN" name="taxPin" />
        <Field label="Payment terms (days)" name="paymentTermsDays" defaultValue="30" />
        <Field label="Currency" name="currency" defaultValue="KES" />
        <Field label="Email" name="email" type="email" />
        <Field label="Phone" name="phone" />
        <Field label="Address" name="address" />
        <Field label="Notes" name="notes" />
        <Button type="submit">Save customer</Button>
      </form>
    </div>
  );
}
