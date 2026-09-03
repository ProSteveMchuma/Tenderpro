import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { ButtonLink } from "@/components/shared/button-link";
import { DataTable } from "@/components/shared/data-table";

export default async function GrnPage() {
  const ctx = await requirePermission("grns.read");
  const rows = await query<{ id: string; number: string; status: string; grn_date: string | null; po: string | null }>(
    `select g.id, g.number, g.status, g.grn_date::text, po.number as po
     from goods_receipts g left join purchase_orders po on po.id=g.purchase_order_id
     where g.organization_id=$1 and g.deleted_at is null order by g.created_at desc`,
    [ctx.membership.organizationId],
  );
  return (
    <div>
      <PageHeader
        title="GRNs"
        description="A signed goods receipt is the gate that unblocks invoicing."
        action={<ButtonLink href="/app/grns/new">Record GRN</ButtonLink>}
      />
      <DataTable
        rows={rows}
        emptyTitle="No GRNs yet"
        emptyDescription="Record a signed GRN so the related PO can be invoiced."
        emptyHref="/app/grns/new"
        emptyAction="Record GRN"
        columns={[
          { key: "number", header: "GRN", cell: (row) => <span className="font-medium">{row.number}</span> },
          { key: "po", header: "PO", cell: (row) => row.po || "—" },
          { key: "date", header: "Date", cell: (row) => row.grn_date || "—" },
          { key: "status", header: "Status", cell: (row) => <StatusBadge value={row.status} /> },
        ]}
      />
    </div>
  );
}
