import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { KpiCard, PageHeader, StatusBadge } from "@/components/shared/chrome";
import { ButtonLink } from "@/components/shared/button-link";
import { DataTable } from "@/components/shared/data-table";
import { expiryStatus } from "@/lib/dates";
import { VAULT_CATEGORIES } from "@/lib/constants";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

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
        action={<ButtonLink href="/app/vault/new">Upload document</ButtonLink>}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <KpiCard label="Valid" value={String(counts.valid)} icon={CheckCircle2} tone="success" />
        <KpiCard label="Expiring soon" value={String(counts.expiring_soon)} icon={Clock} tone={counts.expiring_soon ? "warning" : "default"} />
        <KpiCard label="Expired" value={String(counts.expired)} icon={AlertTriangle} tone={counts.expired ? "danger" : "default"} />
      </div>
      <DataTable
        rows={rows}
        emptyTitle="Vault is empty"
        emptyDescription="Upload certificates, licences and audited accounts so tenders can be checked automatically."
        emptyHref="/app/vault/new"
        emptyAction="Upload document"
        columns={[
          { key: "name", header: "Document", cell: (row) => <span className="font-medium">{row.name}</span> },
          {
            key: "category",
            header: "Category",
            cell: (row) => (
              <span className="capitalize">
                {VAULT_CATEGORIES.includes(row.category as never) ? row.category.replaceAll("_", " ") : row.category}
              </span>
            ),
          },
          { key: "number", header: "Number", hideOnMobile: true, cell: (row) => row.document_number || "—" },
          { key: "expiry", header: "Expiry", cell: (row) => row.expiry_date || "No expiry" },
          { key: "status", header: "Status", cell: (row) => <StatusBadge value={expiryStatus(row.expiry_date, 30, now)} /> },
        ]}
      />
    </div>
  );
}
