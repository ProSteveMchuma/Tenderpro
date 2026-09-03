import Link from "next/link";
import { listByOrg } from "@/lib/db/repo";
import { asString } from "@/lib/db/types";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";

export default async function DeliveriesPage() {
  const ctx = await requirePermission("deliveries.read");
  const orgId = ctx.membership.organizationId;
  const deliveries = await listByOrg("deliveries", orgId, { orderBy: [{ field: "createdAt", direction: "desc" }] });
  const customers = await listByOrg("customers", orgId);
  const pos = await listByOrg("purchase_orders", orgId);
  const customerById = new Map(customers.map((row) => [asString(row.id), asString(row.name)]));
  const poById = new Map(pos.map((row) => [asString(row.id), asString(row.number)]));
  const rows = deliveries.map((row) => ({
    id: asString(row.id),
    number: asString(row.number),
    status: asString(row.status),
    customer: customerById.get(asString(row.customerId)) ?? "",
    po: poById.get(asString(row.purchaseOrderId)) ?? "",
    delivery_date: asString(row.deliveryDate),
  }));
  return (
    <div>
      <PageHeader title="Deliveries" action={<Link className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground" href="/app/deliveries/new">Record delivery</Link>} />
      <SimpleTable rows={rows} columns={["number", "customer", "po", "delivery_date", "status"]} />
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
