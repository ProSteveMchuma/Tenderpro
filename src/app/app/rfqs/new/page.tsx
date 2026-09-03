import { createRfqAction } from "@/app/actions/records";
import { PageHeader } from "@/components/shared/chrome";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export default function NewRfqPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="Create RFQ" />
      <form action={createRfqAction} className="rounded-xl border bg-background p-6">
        <Field label="Title" name="title" required />
        <Field label="Description" name="description" />
        <Field label="Required delivery date" name="requiredDeliveryDate" type="date" />
        <Field label="Location" name="location" />
        <Field label="Deadline" name="deadline" type="datetime-local" />
        <Button type="submit">Save RFQ</Button>
      </form>
    </div>
  );
}
