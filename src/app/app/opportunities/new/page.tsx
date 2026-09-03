import { createOpportunityAction } from "@/app/actions/records";
import { requirePermission } from "@/lib/auth/session";
import { query } from "@/lib/db/client";
import { PageHeader } from "@/components/shared/chrome";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { OPPORTUNITY_STAGES } from "@/lib/constants";

export default async function NewOpportunityPage() {
  const ctx = await requirePermission("opportunities.write");
  const customers = await query<{ id: string; name: string }>(
    "select id, name from customers where organization_id=$1 and deleted_at is null order by name",
    [ctx.membership.organizationId],
  );
  return (
    <div className="max-w-xl">
      <PageHeader title="New opportunity" />
      <form action={createOpportunityAction} className="rounded-xl border border-border/80 bg-card p-6 shadow-xs">
        <Field label="Title" name="title" required />
        <Field label="Customer">
          <select name="customerId" className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
            <option value="">Unassigned</option>
            {customers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Estimated value" name="estimatedValue" defaultValue="0" />
        <Field label="Probability %" name="probability" defaultValue="10" />
        <Field label="Expected closing date" name="expectedCloseDate" type="date" />
        <Field label="Source" name="source" />
        <Field label="Stage">
          <select name="stage" className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
            {OPPORTUNITY_STAGES.map((stage) => (
              <option key={stage}>{stage}</option>
            ))}
          </select>
        </Field>
        <Field label="Notes" name="notes" />
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
}
