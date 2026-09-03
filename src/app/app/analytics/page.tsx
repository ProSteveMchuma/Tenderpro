import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, Panel, PanelHeader } from "@/components/shared/chrome";
import { formatMoney } from "@/lib/money";

export default async function AnalyticsPage() {
  const ctx = await requirePermission("analytics.read");
  const byCustomer = await query<{ name: string; total: string }>(
    `select c.name, coalesce(sum(i.total),0)::text as total
     from customers c left join invoices i on i.customer_id=c.id and i.deleted_at is null
     where c.organization_id=$1 and c.deleted_at is null
     group by c.name order by sum(i.total) desc nulls last`,
    [ctx.membership.organizationId],
  );
  const tenderStats = await queryOneStats(ctx.membership.organizationId);
  const max = Math.max(...byCustomer.map((row) => Number(row.total || 0)), 1);
  return (
    <div>
      <PageHeader title="Analytics" description="Tenant-private performance. Cross-organization payment intelligence is modelled but not exposed." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Sales by customer" />
          <div className="space-y-3 p-4">
            {byCustomer.map((row) => (
              <div key={row.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{row.name}</span>
                  <span className="tabular-nums">{formatMoney(row.total, ctx.membership.currency)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(Number(row.total || 0) / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Tender outcomes" />
          <div className="space-y-3 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted / active</span>
              <span className="tabular-nums">{tenderStats.active}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Awards</span>
              <span className="tabular-nums">{tenderStats.awarded}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Losses</span>
              <span className="tabular-nums">{tenderStats.lost}</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

async function queryOneStats(orgId: string) {
  const { queryOne } = await import("@/lib/db/client");
  const row = await queryOne<{ active: number; awarded: number; lost: number }>(
    `select
       count(*) filter (where status not in ('lost','cancelled'))::int as active,
       count(*) filter (where status='awarded')::int as awarded,
       count(*) filter (where status='lost')::int as lost
     from tenders where organization_id=$1 and deleted_at is null`,
    [orgId],
  );
  return row ?? { active: 0, awarded: 0, lost: 0 };
}
