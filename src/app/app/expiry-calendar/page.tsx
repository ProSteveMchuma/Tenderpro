import { listByOrg } from "@/lib/db/repo";
import { asString } from "@/lib/db/types";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { expiryStatus } from "@/lib/dates";

export default async function ExpiryCalendarPage() {
  const ctx = await requirePermission("vault.read");
  const rows = (await listByOrg("company_documents", ctx.membership.organizationId, { orderBy: [{ field: "expiryDate", direction: "asc" }] }))
    .filter((row) => Boolean(row.expiryDate))
    .map((row) => ({
      name: asString(row.name),
      expiryDate: asString(row.expiryDate),
    }));
  return (
    <div>
      <PageHeader title="Expiry calendar" description="Reminders at 90, 60, 30, 14, 7 and 1 day are generated from these dates." />
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between rounded-xl border bg-background px-4 py-3">
            <div>
              <div className="font-medium">{row.name}</div>
              <div className="text-sm text-muted-foreground">{row.expiryDate}</div>
            </div>
            <StatusBadge value={expiryStatus(row.expiryDate)} />
          </div>
        ))}
      </div>
    </div>
  );
}
