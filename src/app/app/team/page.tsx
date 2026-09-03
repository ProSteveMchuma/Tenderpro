import { query } from "@/lib/db/client";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/chrome";
import { inviteMemberAction } from "@/app/actions/records";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { ROLES } from "@/lib/constants";

export default async function TeamPage() {
  const ctx = await requirePermission("team.read");
  const rows = await query<{ full_name: string; email: string; role: string; status: string }>(
    `select p.full_name, p.email, m.role, m.status
     from organization_members m join profiles p on p.id=m.user_id
     where m.organization_id=$1 and m.deleted_at is null order by m.role`,
    [ctx.membership.organizationId],
  );
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div>
        <PageHeader title="Team" description="Users can belong to multiple organizations and switch from the top bar." />
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Status</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.email} className="border-t"><td className="px-3 py-2">{row.full_name}</td><td className="px-3 py-2">{row.email}</td><td className="px-3 py-2 capitalize">{row.role}</td><td className="px-3 py-2">{row.status}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <form action={inviteMemberAction} className="rounded-xl border bg-background p-4">
        <h2 className="font-medium">Invite member</h2>
        <Field label="Email" name="email" type="email" required />
        <Field label="Role">
          <select name="role" className="h-9 w-full rounded-lg border px-3 text-sm">{ROLES.map((role) => <option key={role}>{role}</option>)}</select>
        </Field>
        <Button type="submit">Send invite</Button>
      </form>
    </div>
  );
}
