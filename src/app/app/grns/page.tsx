import Link from "next/link";
import { listByOrg } from "@/lib/db/repo";
import { asString } from "@/lib/db/types";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";

export default async function GrnPage() {
  const ctx = await requirePermission("grns.read");
  const orgId = ctx.membership.organizationId;
  const grns = await listByOrg("goods_receipts", orgId, { orderBy: [{ field: "createdAt", direction: "desc" }] });
  const pos = await listByOrg("purchase_orders", orgId);
  const poById = new Map(pos.map((row) => [asString(row.id), asString(row.number)]));
  const rows = grns.map((row) => ({
    id: asString(row.id),
    number: asString(row.number),
    status: asString(row.status),
    grnDate: row.grnDate ? asString(row.grnDate) : null,
    po: poById.get(asString(row.purchaseOrderId)) ?? null,
  }));
  return (
    <div>
      <PageHeader title="GRNs" action={<Link className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground" href="/app/grns/new">Record GRN</Link>} />
      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="px-3 py-2">GRN</th><th className="px-3 py-2">PO</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Status</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{row.number}</td>
                <td className="px-3 py-2">{row.po}</td>
                <td className="px-3 py-2">{row.grnDate}</td>
                <td className="px-3 py-2"><StatusBadge value={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
