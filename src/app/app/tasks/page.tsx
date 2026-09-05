import { listByOrg } from "@/lib/db/repo";
import { asString } from "@/lib/db/types";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, StatusBadge } from "@/components/shared/chrome";
import { completeTaskAction, createTaskAction } from "@/app/actions/records";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export default async function TasksPage() {
  const ctx = await requirePermission("tasks.read");
  const rows = (await listByOrg("tasks", ctx.membership.organizationId, { orderBy: [{ field: "dueDate", direction: "asc" }] }))
    .map((row) => ({
      id: asString(row.id),
      title: asString(row.title),
      priority: asString(row.priority),
      dueDate: row.dueDate ? asString(row.dueDate) : null,
      status: asString(row.status),
    }))
    .sort((a, b) => a.status.localeCompare(b.status) || asString(a.dueDate).localeCompare(asString(b.dueDate)));
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div>
        <PageHeader title="Tasks" />
        <div className="space-y-2">
          {rows.map((row) => (
            <form key={row.id} action={completeTaskAction} className="flex items-center justify-between rounded-xl border bg-background px-4 py-3">
              <div>
                <div className="font-medium">{row.title}</div>
                <div className="text-xs text-muted-foreground">{row.dueDate} · {row.priority}</div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge value={row.status} />
                {row.status !== "complete" ? (
                  <>
                    <input type="hidden" name="id" value={row.id} />
                    <Button type="submit" size="sm" variant="outline">Complete</Button>
                  </>
                ) : null}
              </div>
            </form>
          ))}
        </div>
      </div>
      <form action={createTaskAction} className="rounded-xl border bg-background p-4">
        <h2 className="font-medium">New task</h2>
        <Field label="Title" name="title" required />
        <Field label="Description" name="description" />
        <Field label="Due date" name="dueDate" type="date" />
        <Field label="Priority" name="priority" defaultValue="medium" />
        <Button type="submit">Create task</Button>
      </form>
    </div>
  );
}
