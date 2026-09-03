import Link from "next/link";
import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";

export default async function TendersPage() {
  const ctx = await requirePermission("tenders.read");
  const rows = await query<{
    id: string;
    title: string;
    reference: string | null;
    procuring_entity: string | null;
    closing_at: string | null;
    tender_value: string | null;
    status: string;
    readiness_percent: number;
  }>(
    `select id, title, reference, procuring_entity, closing_at::text, tender_value::text, status, readiness_percent
     from tenders where organization_id=$1 and deleted_at is null order by closing_at nulls last`,
    [ctx.membership.organizationId],
  );
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
                <td className="px-3 py-2">{row.procuring_entity}</td>
                <td className="px-3 py-2">{formatDateTime(row.closing_at, ctx.membership.timezone)}</td>
                <td className="px-3 py-2 tabular-nums">{row.tender_value ? formatMoney(row.tender_value, ctx.membership.currency) : "—"}</td>
                <td className="px-3 py-2">{row.readiness_percent}%</td>
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
