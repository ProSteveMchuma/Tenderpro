import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/data/workspace";
import { formatMoney } from "@/lib/money";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const ctx = await requireAuth();
  const data = await getDashboardData(ctx);
  const currency = ctx.membership.currency;
  const kpis = [
    { label: "Outstanding Receivables", value: formatMoney(data.kpis.outstanding, currency) },
    { label: "Overdue", value: formatMoney(data.kpis.overdue, currency) },
    { label: "Due This Week", value: formatMoney(data.kpis.dueThisWeek, currency) },
    { label: "Active Tenders", value: String(data.kpis.activeTenders) },
    { label: "POs In Progress", value: String(data.kpis.posInProgress) },
    { label: "Documents Expiring", value: String(data.kpis.documentsExpiring) },
  ];

  return (
    <div>
      <PageHeader
        title="Overview"
        description="SupplierOS does not just store documents. It tells you what to do next so you can collect money."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Tasks requiring attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.attention.length === 0 ? (
              <p className="text-sm text-muted-foreground">No urgent follow-ups right now.</p>
            ) : (
              data.attention.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`block rounded-lg border px-3 py-2 text-sm ${
                    item.tone === "danger"
                      ? "border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
                      : item.tone === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30"
                        : "bg-muted/40"
                  }`}
                >
                  {item.title}
                </Link>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Receivables ageing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(data.ageing).map(([bucket, amount]) => (
              <div key={bucket} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{bucket} days</span>
                <span className="tabular-nums">{formatMoney(amount, currency)}</span>
              </div>
            ))}
            <div className="border-t pt-3 text-sm">
              <div className="flex justify-between">
                <span>Pipeline value</span>
                <span className="tabular-nums">{formatMoney(data.pipeline, currency)}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span>Tender pipeline</span>
                <span className="tabular-nums">{formatMoney(data.tenderPipeline, currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoices by payment status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.invoiceStatus.map((row) => (
              <div key={row.status} className="flex items-center justify-between gap-3 text-sm">
                <StatusBadge value={row.status} />
                <span className="tabular-nums">{formatMoney(row.total, currency)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data.activity as Array<{ id: string; actorName: string; summary: string; createdAt: string }>).map((item) => (
              <div key={item.id} className="text-sm">
                <div>{item.summary}</div>
                <div className="text-xs text-muted-foreground">{item.actorName}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
