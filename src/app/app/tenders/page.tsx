import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { Meter, PageHeader, StatusBadge } from "@/components/shared/chrome";
import { ButtonLink } from "@/components/shared/button-link";
import { DataTable } from "@/components/shared/data-table";
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
        description="Capture requirements, readiness and submission risk before the close date."
        action={<ButtonLink href="/app/tenders/new">New tender</ButtonLink>}
      />
      <DataTable
        rows={rows}
        getHref={(row) => `/app/tenders/${row.id}`}
        emptyTitle="No tenders yet"
        emptyDescription="Upload a tender document and we’ll extract requirements for review."
        emptyHref="/app/tenders/new"
        emptyAction="New tender"
        columns={[
          {
            key: "tender",
            header: "Tender",
            cell: (row) => (
              <div>
                <div className="font-medium">{row.reference || row.title}</div>
                <div className="text-xs text-muted-foreground">{row.title}</div>
              </div>
            ),
          },
          { key: "entity", header: "Entity", cell: (row) => row.procuring_entity || "—" },
          { key: "closes", header: "Closes", cell: (row) => formatDateTime(row.closing_at, ctx.membership.timezone) },
          {
            key: "value",
            header: "Value",
            align: "right",
            cell: (row) => (row.tender_value ? <span className="tabular-nums">{formatMoney(row.tender_value, ctx.membership.currency)}</span> : "—"),
          },
          { key: "readiness", header: "Readiness", cell: (row) => <Meter value={row.readiness_percent} /> },
          { key: "status", header: "Status", cell: (row) => <StatusBadge value={row.status} /> },
        ]}
      />
    </div>
  );
}
