import { listByOrg } from "@/lib/db/repo";
import { asString } from "@/lib/db/types";
import { requireAuth } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/chrome";
import { markNotificationReadAction } from "@/app/actions/records";
import { Button } from "@/components/ui/button";

export default async function NotificationsPage() {
  const ctx = await requireAuth();
  const rows = (await listByOrg("notifications", ctx.membership.organizationId, {
    where: [{ field: "userId", op: "==", value: ctx.user.id }],
    orderBy: [{ field: "createdAt", direction: "desc" }],
    limit: 50,
  })).map((row) => ({
    id: asString(row.id),
    title: asString(row.title),
    body: asString(row.body),
    type: asString(row.type),
    readAt: row.readAt ? asString(row.readAt) : null,
  }));
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
              {!row.readAt ? (
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
