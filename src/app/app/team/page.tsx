import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader, Panel } from "@/components/shared/chrome";
import { DataTable } from "@/components/shared/data-table";
import { inviteMemberAction } from "@/app/actions/records";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { ROLES } from "@/lib/constants";

export default async function TeamPage() {
  const ctx = await requirePermission("team.read");
  const rows = await query<{ id: string; full_name: string; email: string; role: string; status: string }>(
    `select p.id, p.full_name, p.email, m.role, m.status
     from organization_members m join profiles p on p.id=m.user_id
     where m.organization_id=$1 and m.deleted_at is null order by m.role`,
    [ctx.membership.organizationId],
  );
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div>
        <PageHeader title="Team" description="Users can belong to multiple organizations and switch from the top bar." />
        <DataTable
          rows={rows}
          emptyTitle="No members"
          emptyDescription="Invite finance, procurement and operations colleagues."
          columns={[
            { key: "name", header: "Name", cell: (row) => row.full_name },
            { key: "email", header: "Email", cell: (row) => row.email },
            { key: "role", header: "Role", cell: (row) => <span className="capitalize">{row.role}</span> },
            { key: "status", header: "Status", cell: (row) => <span className="capitalize">{row.status}</span> },
          ]}
        />
      </div>
      <Panel className="p-4">
        <form action={inviteMemberAction}>
          <h2 className="text-sm font-semibold">Invite member</h2>
          <Field label="Email" name="email" type="email" required />
          <Field label="Role">
            <select name="role" className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
              {ROLES.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </Field>
          <Button type="submit">Send invite</Button>
        </form>
      </Panel>
    </div>
  );
}
