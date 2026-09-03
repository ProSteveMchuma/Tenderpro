import Link from "next/link";
import { listByOrg } from "@/lib/db/repo";
import { asString } from "@/lib/db/types";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";

export default async function RfqsPage() {
  const ctx = await requirePermission("rfqs.read");
  const rows = (await listByOrg("rfqs", ctx.membership.organizationId, { orderBy: [{ field: "createdAt", direction: "desc" }] })).map((row) => ({
    id: asString(row.id),
    number: asString(row.number),
    title: asString(row.title),
    status: asString(row.status),
    deadline: row.deadline ? asString(row.deadline) : null,
  }));
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
