import { createTenderAction } from "@/app/actions/records";
import { requirePermission } from "@/lib/auth/session";
import { listByOrg } from "@/lib/db/repo";
import { asString } from "@/lib/db/types";
import { PageHeader } from "@/components/shared/chrome";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export default async function NewTenderPage() {
  const ctx = await requirePermission("tenders.write");
  const customers = (await listByOrg("customers", ctx.membership.organizationId, { orderBy: [{ field: "name", direction: "asc" }] })).map((item) => ({
    id: asString(item.id),
    name: asString(item.name),
  }));
  return (
    <div className="max-w-2xl">
      <PageHeader title="New tender" description="Create manually or upload a tender document for AI analysis." />
      <form action={createTenderAction} className="rounded-xl border bg-background p-6">
        <Field label="Tender title" name="title" required />
        <Field label="Reference" name="reference" />
        <Field label="Procuring entity" name="procuringEntity" />
        <Field label="Customer">
          <select name="customerId" className="h-9 w-full rounded-lg border px-3 text-sm">
            <option value="">Select customer</option>
            {customers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Closing date" name="closingDate" type="date" />
          <Field label="Closing time" name="closingTime" type="time" defaultValue="10:00" />
        </div>
        <Field label="Category" name="category" />
        <Field label="Submission method" name="submissionMethod" />
        <Field label="Submission location / portal" name="submissionLocation" />
        <Field label="Tender value" name="tenderValue" />
        <Field label="Tender security amount" name="tenderSecurityAmount" />
        <Field label="Tender validity period" name="tenderValidityPeriod" />
        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-medium">Upload tender document</span>
          <input type="file" name="file" className="block w-full text-sm" />
        </label>
        <Button type="submit">Save and analyse</Button>
      </form>
    </div>
  );
}
