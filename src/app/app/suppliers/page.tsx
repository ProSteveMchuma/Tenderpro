import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/chrome";
import { ButtonLink } from "@/components/shared/button-link";
import { DataTable } from "@/components/shared/data-table";

export default async function SuppliersPage() {
  const ctx = await requirePermission("suppliers.read");
  const rows = await query<{ id: string; name: string; category: string | null; rating: string | null; location: string | null }>(
    `select id, name, category, rating::text, location from suppliers where organization_id=$1 and deleted_at is null order by name`,
    [ctx.membership.organizationId],
  );
  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Upstream vendors you buy from when fulfilling a purchase order."
        action={<ButtonLink href="/app/suppliers/new">Add supplier</ButtonLink>}
      />
      <DataTable
        rows={rows}
        emptyTitle="No suppliers yet"
        emptyDescription="Add the vendors you source from for RFQs and quotations."
        emptyHref="/app/suppliers/new"
        emptyAction="Add supplier"
        columns={[
          { key: "name", header: "Supplier", cell: (row) => <span className="font-medium">{row.name}</span> },
          { key: "category", header: "Category", cell: (row) => row.category || "—" },
          { key: "location", header: "Location", cell: (row) => row.location || "—" },
          { key: "rating", header: "Rating", align: "right", cell: (row) => row.rating || "—" },
        ]}
      />
    </div>
  );
}
