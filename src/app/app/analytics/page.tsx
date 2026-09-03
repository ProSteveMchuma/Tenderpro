import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/chrome";
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
  return (
    <div>
      <PageHeader title="Analytics" description="Tenant-private performance. Cross-organization payment intelligence is modelled but not exposed." />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-background p-4">
          <h2 className="font-medium">Sales by customer</h2>
          <div className="mt-3 space-y-2 text-sm">
            {byCustomer.map((row) => (
              <div key={row.name} className="flex justify-between"><span>{row.name}</span><span className="tabular-nums">{formatMoney(row.total, ctx.membership.currency)}</span></div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <h2 className="font-medium">Tender outcomes</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span>Submitted / active</span><span>{tenderStats.active}</span></div>
            <div className="flex justify-between"><span>Awards</span><span>{tenderStats.awarded}</span></div>
            <div className="flex justify-between"><span>Losses</span><span>{tenderStats.lost}</span></div>
          </div>
        </div>
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
