import Link from "next/link";
import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { expiryStatus } from "@/lib/dates";
import { VAULT_CATEGORIES } from "@/lib/constants";

export default async function VaultPage() {
  const ctx = await requirePermission("vault.read");
  const rows = await query<{
    id: string;
    name: string;
    category: string;
    document_number: string | null;
    expiry_date: string | null;
    issuing_authority: string | null;
  }>(
    `select id, name, category, document_number, expiry_date::text, issuing_authority
     from company_documents where organization_id=$1 and deleted_at is null order by expiry_date nulls last`,
    [ctx.membership.organizationId],
  );
  const now = new Date();
  const counts = {
    valid: rows.filter((row) => expiryStatus(row.expiry_date, 30, now) === "valid" || (!row.expiry_date && row.name)).length,
    expiring_soon: rows.filter((row) => expiryStatus(row.expiry_date, 30, now) === "expiring_soon").length,
    expired: rows.filter((row) => expiryStatus(row.expiry_date, 30, now) === "expired").length,
  };
  return (
    <div>
      <PageHeader
        title="Company Vault"
        description="The compliance library every tender is checked against."
        action={
          <Link href="/app/vault/new" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">
            Upload document
          </Link>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4 text-sm">Valid {counts.valid}</div>
        <div className="rounded-xl border p-4 text-sm">Expiring soon {counts.expiring_soon}</div>
        <div className="rounded-xl border p-4 text-sm">Expired {counts.expired}</div>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Document</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Number</th>
              <th className="px-3 py-2">Expiry</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const status = expiryStatus(row.expiry_date, 30, now);
              return (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2">{VAULT_CATEGORIES.includes(row.category as never) ? row.category.replaceAll("_", " ") : row.category}</td>
                  <td className="px-3 py-2">{row.document_number}</td>
                  <td className="px-3 py-2">{row.expiry_date || "No expiry"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge value={status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
