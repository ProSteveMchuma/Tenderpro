import { requireAuth } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/data/workspace";
import { formatMoney } from "@/lib/money";
import { AgeingBar, AttentionRow, KpiCard, PageHeader, Panel, PanelHeader, StatusBadge } from "@/components/shared/chrome";
import { ButtonLink } from "@/components/shared/button-link";
import {
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  FileText,
  ShoppingCart,
  ShieldAlert,
} from "lucide-react";

export default async function DashboardPage() {
  const ctx = await requireAuth();
  const data = await getDashboardData(ctx);
  const currency = ctx.membership.currency;
  const overdueAmount = Number(data.kpis.overdue);
  const kpis = [
    {
      label: "Outstanding",
      value: formatMoney(data.kpis.outstanding, currency),
      hint: "Cash still to collect",
      href: "/app/receivables",
      icon: CircleDollarSign,
      tone: "default" as const,
    },
    {
      label: "Overdue",
      value: formatMoney(data.kpis.overdue, currency),
      hint: overdueAmount > 0 ? "Follow up today" : "Nothing overdue",
      href: "/app/receivables",
      icon: AlertTriangle,
      tone: overdueAmount > 0 ? ("danger" as const) : ("success" as const),
    },
    {
      label: "Due this week",
      value: formatMoney(data.kpis.dueThisWeek, currency),
      hint: "Invoices approaching due date",
      href: "/app/invoices",
      icon: CalendarClock,
      tone: "warning" as const,
    },
    {
      label: "Active tenders",
      value: String(data.kpis.activeTenders),
      hint: "Bids still in play",
      href: "/app/tenders",
      icon: FileText,
      tone: "default" as const,
    },
    {
      label: "POs in progress",
      value: String(data.kpis.posInProgress),
      hint: "Orders not yet invoiced",
      href: "/app/purchase-orders",
      icon: ShoppingCart,
      tone: "default" as const,
    },
    {
      label: "Documents expiring",
      value: String(data.kpis.documentsExpiring),
      hint: "Certificates due in 30 days",
      href: "/app/vault",
      icon: ShieldAlert,
      tone: data.kpis.documentsExpiring > 0 ? ("warning" as const) : ("default" as const),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Overview"
        description="See what is blocking cash, bids and compliance — then do the next action."
        action={
          <div className="flex gap-2">
            <ButtonLink href="/app/tenders/new" variant="outline" size="lg">
              Upload tender
            </ButtonLink>
            <ButtonLink href="/app/invoices/new" size="lg">
              Create invoice
            </ButtonLink>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((item) => (
          <KpiCard key={item.label} {...item} />
        ))}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Needs attention"
            description="The work that loses money if you wait."
            action={
              <ButtonLink href="/app/tasks" variant="ghost" size="sm">
                All tasks
              </ButtonLink>
            }
          />
          <div className="space-y-2 p-4">
            {data.attention.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No urgent follow-ups right now.</p>
            ) : (
              data.attention.map((item) => (
                <AttentionRow
                  key={`${item.href}-${item.title}`}
                  title={item.title}
                  href={item.href}
                  tone={item.tone}
                  actionLabel={item.actionLabel}
                />
              ))
            )}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Receivables ageing" description="Age of unpaid invoices." />
          <div className="space-y-4 p-4">
            <AgeingBar buckets={data.ageing} currency={currency} />
            <div className="space-y-2 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pipeline value</span>
                <span className="tabular-nums">{formatMoney(data.pipeline, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tender pipeline</span>
                <span className="tabular-nums">{formatMoney(data.tenderPipeline, currency)}</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Invoices by payment status" />
          <div className="space-y-2 p-4">
            {data.invoiceStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              data.invoiceStatus.map((row) => (
                <div key={row.status} className="flex items-center justify-between gap-3 text-sm">
                  <StatusBadge value={row.status} />
                  <span className="tabular-nums">{formatMoney(row.total, currency)}</span>
                </div>
              ))
            )}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Recent activity" />
          <div className="divide-y">
            {(data.activity as Array<{ id: string; actorName: string; summary: string; createdAt: string }>).length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Activity will appear as the team works.</p>
            ) : (
              (data.activity as Array<{ id: string; actorName: string; summary: string; createdAt: string }>).map((item) => (
                <div key={item.id} className="px-4 py-3">
                  <div className="text-sm">{item.summary}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{item.actorName}</div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
