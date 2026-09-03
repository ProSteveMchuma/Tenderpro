import Link from "next/link";
import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";

export default async function RfqsPage() {
  const ctx = await requirePermission("rfqs.read");
  const rows = await query<{ id: string; number: string; title: string; status: string; deadline: string | null }>(
    `select id, number, title, status, deadline::text from rfqs where organization_id=$1 and deleted_at is null order by created_at desc`,
    [ctx.membership.organizationId],
  );
  return (
    <div>
      <PageHeader title="RFQs" action={<Link className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground" href="/app/rfqs/new">Create RFQ</Link>} />
      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="px-3 py-2">RFQ</th><th className="px-3 py-2">Title</th><th className="px-3 py-2">Deadline</th><th className="px-3 py-2">Status</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t"><td className="px-3 py-2">{row.number}</td><td className="px-3 py-2">{row.title}</td><td className="px-3 py-2">{row.deadline}</td><td className="px-3 py-2"><StatusBadge value={row.status} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
