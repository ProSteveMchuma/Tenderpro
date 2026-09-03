import Link from "next/link";
import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";

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
      <PageHeader title="GRNs" action={<Link className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground" href="/app/grns/new">Record GRN</Link>} />
      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="px-3 py-2">GRN</th><th className="px-3 py-2">PO</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Status</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{row.number}</td>
                <td className="px-3 py-2">{row.po}</td>
                <td className="px-3 py-2">{row.grn_date}</td>
                <td className="px-3 py-2"><StatusBadge value={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
