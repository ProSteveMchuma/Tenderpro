import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, Panel, StatusBadge } from "@/components/shared/chrome";
import { ButtonLink } from "@/components/shared/button-link";
import { DataTable } from "@/components/shared/data-table";
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
            <ButtonLink href={view === "kanban" ? "/app/opportunities" : "/app/opportunities?view=kanban"} variant="outline">
              {view === "kanban" ? "Table" : "Kanban"}
            </ButtonLink>
            <ButtonLink href="/app/opportunities/new">Add opportunity</ButtonLink>
          </div>
        }
      />
      {view === "kanban" ? (
        <div className="grid gap-3 overflow-x-auto pb-2 md:grid-cols-4">
          {OPPORTUNITY_STAGES.map((stage) => (
            <Panel key={stage} className="min-w-[220px] p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {stage.replaceAll("_", " ")}
              </div>
              <div className="space-y-2">
                {rows.filter((row) => row.stage === stage).length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">None</p>
                ) : (
                  rows
                    .filter((row) => row.stage === stage)
                    .map((row) => (
                      <form key={row.id} action={updateOpportunityStageAction} className="rounded-lg border bg-background p-3">
                        <div className="text-sm font-medium">{row.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{formatMoney(row.estimated_value, ctx.membership.currency)}</div>
                        <input type="hidden" name="id" value={row.id} />
                        <AutoSubmitSelect name="stage" defaultValue={row.stage} options={[...OPPORTUNITY_STAGES]} />
                      </form>
                    ))
                )}
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <DataTable
          rows={rows}
          emptyTitle="No opportunities yet"
          emptyDescription="Add a lead before the tender document arrives."
          emptyHref="/app/opportunities/new"
          emptyAction="Add opportunity"
          columns={[
            { key: "title", header: "Title", cell: (row) => <span className="font-medium">{row.title}</span> },
            { key: "stage", header: "Stage", cell: (row) => <StatusBadge value={row.stage} /> },
            {
              key: "value",
              header: "Value",
              align: "right",
              cell: (row) => <span className="tabular-nums">{formatMoney(row.estimated_value, ctx.membership.currency)}</span>,
            },
            { key: "probability", header: "Probability", align: "right", cell: (row) => `${row.probability}%` },
          ]}
        />
      )}
    </div>
  );
}
