import { createSupplierAction } from "@/app/actions/records";
import { PageHeader } from "@/components/shared/chrome";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export default function NewSupplierPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="Add supplier" />
      <form action={createSupplierAction} className="rounded-xl border border-border/80 bg-card p-6 shadow-xs">
        <Field label="Company name" name="name" required />
        <Field label="Category" name="category" />
        <Field label="Contact" name="contactName" />
        <Field label="Phone" name="phone" />
        <Field label="Email" name="email" type="email" />
        <Field label="Tax / PIN" name="taxPin" />
        <Field label="Location" name="location" />
        <Field label="Products / services" name="productsServices" />
        <Field label="Payment terms (days)" name="paymentTermsDays" defaultValue="30" />
        <Field label="Rating 1-5" name="rating" defaultValue="3" />
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
}
