import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, Panel, StatusBadge } from "@/components/shared/chrome";
import { expiryStatus } from "@/lib/dates";

export default async function ExpiryCalendarPage() {
  const ctx = await requirePermission("vault.read");
  const rows = await query<{ id: string; name: string; expiry_date: string }>(
    `select id, name, expiry_date::text from company_documents where organization_id=$1 and deleted_at is null and expiry_date is not null order by expiry_date`,
    [ctx.membership.organizationId],
  );
  return (
    <div>
      <PageHeader title="Expiry calendar" description="Reminders at 90, 60, 30, 14, 7 and 1 day are generated from these dates." />
      <div className="space-y-2">
        {rows.length === 0 ? (
          <Panel className="p-8 text-center text-sm text-muted-foreground">No expiring documents in the vault.</Panel>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-xs">
              <div>
                <div className="font-medium">{row.name}</div>
                <div className="text-sm text-muted-foreground">{row.expiry_date}</div>
              </div>
              <StatusBadge value={expiryStatus(row.expiry_date)} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
