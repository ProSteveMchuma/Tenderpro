import Link from "next/link";
import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { formatMoney } from "@/lib/money";
import { OPPORTUNITY_STAGES } from "@/lib/constants";
import { AutoSubmitSelect } from "@/components/shared/auto-submit-select";
import { updateOpportunityStageAction } from "@/app/actions/records";

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const ctx = await requirePermission("opportunities.read");
  const { view } = await searchParams;
  const rows = await query<{
    id: string;
    title: string;
    stage: string;
    estimated_value: string;
    probability: number;
    expected_close_date: string | null;
  }>(
    `select id, title, stage, estimated_value::text, probability, expected_close_date::text
     from opportunities where organization_id=$1 and deleted_at is null order by created_at desc`,
    [ctx.membership.organizationId],
  );
  return (
    <div>
      <PageHeader
        title="Opportunities"
        description="Track work before a tender document exists."
        action={
          <div className="flex gap-2">
            <Link href="/app/opportunities?view=kanban" className="rounded-lg border px-3 py-1.5 text-sm">
              Kanban
            </Link>
            <Link href="/app/opportunities/new" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">
              Add opportunity
            </Link>
          </div>
        }
      />
      {view === "kanban" ? (
        <div className="grid gap-3 overflow-x-auto md:grid-cols-4">
          {OPPORTUNITY_STAGES.map((stage) => (
            <div key={stage} className="min-w-[220px] rounded-xl border bg-background p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {stage.replaceAll("_", " ")}
              </div>
              <div className="space-y-2">
                {rows
                  .filter((row) => row.stage === stage)
                  .map((row) => (
                    <form key={row.id} action={updateOpportunityStageAction} className="rounded-lg border p-3">
                      <div className="text-sm font-medium">{row.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatMoney(row.estimated_value, ctx.membership.currency)}</div>
                      <input type="hidden" name="id" value={row.id} />
                      <AutoSubmitSelect name="stage" defaultValue={row.stage} options={[...OPPORTUNITY_STAGES]} />
                    </form>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Value</th>
                <th className="px-3 py-2">Probability</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">{row.title}</td>
                  <td className="px-3 py-2">
                    <StatusBadge value={row.stage} />
                  </td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(row.estimated_value, ctx.membership.currency)}</td>
                  <td className="px-3 py-2">{row.probability}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
