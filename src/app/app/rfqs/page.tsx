import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { ButtonLink } from "@/components/shared/button-link";
import { DataTable } from "@/components/shared/data-table";

export default async function RfqsPage() {
  const ctx = await requirePermission("rfqs.read");
  const rows = await query<{ id: string; number: string; title: string; status: string; deadline: string | null }>(
    `select id, number, title, status, deadline::text from rfqs where organization_id=$1 and deleted_at is null order by created_at desc`,
    [ctx.membership.organizationId],
  );
  return (
    <div>
      <PageHeader
        title="RFQs"
        description="Request quotations from suppliers, then compare them on more than price."
        action={<ButtonLink href="/app/rfqs/new">Create RFQ</ButtonLink>}
      />
      <DataTable
        rows={rows}
        emptyTitle="No RFQs yet"
        emptyDescription="Create an RFQ when you need to source for a purchase order."
        emptyHref="/app/rfqs/new"
        emptyAction="Create RFQ"
        columns={[
          { key: "number", header: "RFQ", cell: (row) => <span className="font-medium">{row.number}</span> },
          { key: "title", header: "Title", cell: (row) => row.title },
          { key: "deadline", header: "Deadline", cell: (row) => row.deadline || "—" },
          { key: "status", header: "Status", cell: (row) => <StatusBadge value={row.status} /> },
        ]}
      />
    </div>
  );
}
