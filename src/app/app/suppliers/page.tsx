import Link from "next/link";
import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/chrome";

export default async function SuppliersPage() {
  const ctx = await requirePermission("suppliers.read");
  const rows = await query<{ id: string; name: string; category: string | null; rating: string | null; location: string | null }>(
    `select id, name, category, rating::text, location from suppliers where organization_id=$1 and deleted_at is null order by name`,
    [ctx.membership.organizationId],
  );
  return (
    <div>
      <PageHeader title="Suppliers" action={<Link className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground" href="/app/suppliers/new">Add supplier</Link>} />
      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="px-3 py-2">Supplier</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Location</th><th className="px-3 py-2">Rating</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t"><td className="px-3 py-2 font-medium">{row.name}</td><td className="px-3 py-2">{row.category}</td><td className="px-3 py-2">{row.location}</td><td className="px-3 py-2">{row.rating}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
