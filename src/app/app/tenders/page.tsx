import Link from "next/link";
import { listByOrg } from "@/lib/db/repo";
import { asString, moneyString } from "@/lib/db/types";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";

export default async function TendersPage() {
  const ctx = await requirePermission("tenders.read");
  const rows = (await listByOrg("tenders", ctx.membership.organizationId, { orderBy: [{ field: "closingAt", direction: "asc" }] })).map((row) => ({
    id: asString(row.id),
    title: asString(row.title),
    reference: row.reference ? asString(row.reference) : null,
    procuringEntity: row.procuringEntity ? asString(row.procuringEntity) : null,
    closingAt: row.closingAt ? asString(row.closingAt) : null,
    tenderValue: row.tenderValue ? moneyString(row.tenderValue) : null,
    status: asString(row.status),
    readinessPercent: Number(row.readinessPercent ?? 0),
  }));
  return (
    <div>
      <PageHeader
        title="Tenders"
        description="Capture requirements, readiness and submission risk."
        action={
          <Link href="/app/tenders/new" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">
            New tender
          </Link>
        }
      />
      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Tender</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Closes</th>
              <th className="px-3 py-2">Value</th>
              <th className="px-3 py-2">Readiness</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">
                  <Link href={`/app/tenders/${row.id}`} className="font-medium hover:underline">
                    {row.reference || row.title}
                  </Link>
                  <div className="text-xs text-muted-foreground">{row.title}</div>
                </td>
                <td className="px-3 py-2">{row.procuringEntity}</td>
                <td className="px-3 py-2">{formatDateTime(row.closingAt, ctx.membership.timezone)}</td>
                <td className="px-3 py-2 tabular-nums">{row.tenderValue ? formatMoney(row.tenderValue, ctx.membership.currency) : "—"}</td>
                <td className="px-3 py-2">{row.readinessPercent}%</td>
                <td className="px-3 py-2">
                  <StatusBadge value={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
