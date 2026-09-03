import { query } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/chrome";
import { markNotificationReadAction } from "@/app/actions/records";
import { Button } from "@/components/ui/button";

export default async function NotificationsPage() {
  const ctx = await requireAuth();
  const rows = await query<{ id: string; title: string; body: string; type: string; read_at: string | null; created_at: string }>(
    `select id, title, body, type, read_at::text, created_at::text from notifications where organization_id=$1 order by created_at desc limit 50`,
    [ctx.membership.organizationId],
  );
  return (
    <div>
      <PageHeader title="Notifications" description="In-app alerts now. Email, WhatsApp and push adapters are ready when credentials are supplied." />
      <div className="space-y-2">
        {rows.map((row) => (
          <form key={row.id} action={markNotificationReadAction} className="rounded-xl border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{row.title}</div>
                <p className="text-sm text-muted-foreground">{row.body}</p>
              </div>
              {!row.read_at ? (
                <>
                  <input type="hidden" name="id" value={row.id} />
                  <Button type="submit" size="sm" variant="outline">Mark read</Button>
                </>
              ) : null}
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
