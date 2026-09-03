import Link from "next/link";
import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";

export default async function DeliveriesPage() {
  const ctx = await requirePermission("deliveries.read");
  const rows = await query(
    `select d.id, d.number, d.status, d.delivery_date::text, c.name as customer, po.number as po
     from deliveries d
     left join customers c on c.id=d.customer_id
     left join purchase_orders po on po.id=d.purchase_order_id
     where d.organization_id=$1 and d.deleted_at is null order by d.created_at desc`,
    [ctx.membership.organizationId],
  );
  return (
    <div>
      <PageHeader title="Deliveries" action={<Link className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground" href="/app/deliveries/new">Record delivery</Link>} />
      <SimpleTable rows={rows as Record<string, string>[]} columns={["number", "customer", "po", "delivery_date", "status"]} />
    </div>
  );
}

function SimpleTable({ rows, columns }: { rows: Record<string, string>[]; columns: string[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-background">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 capitalize">{col.replaceAll("_", " ")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id || row.number} className="border-t">
              {columns.map((col) => (
                <td key={col} className="px-3 py-2">
                  {col === "status" ? <StatusBadge value={String(row[col] || "")} /> : String(row[col] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
