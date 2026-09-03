import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/chrome";
import { updateSettingsAction } from "@/app/actions/records";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/actions/auth";
import { COUNTRIES, CURRENCIES, DEFAULT_TIMEZONE } from "@/lib/constants";

export default async function SettingsPage() {
  const ctx = await requirePermission("settings.read");
  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" description="Organization, currency, tax and security controls." />
      <form action={updateSettingsAction} className="rounded-xl border bg-background p-6">
        <Field label="Organization name" name="name" defaultValue={ctx.membership.organizationName} />
        <Field label="Timezone" name="timezone" defaultValue={ctx.membership.timezone || DEFAULT_TIMEZONE} />
        <Field label="Currency">
          <select name="currency" defaultValue={ctx.membership.currency} className="h-9 w-full rounded-lg border px-3 text-sm">
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="VAT rate" name="vatRate" defaultValue={ctx.membership.vatRate} />
        <Field label="Reminder days JSON" name="reminderDays" defaultValue="[90,60,30,14,7,1]" />
        <Button type="submit">Save settings</Button>
      </form>
      <div className="mt-6 grid gap-3 text-sm md:grid-cols-2">
        {["Organization","Profile","Team","Roles","Billing","Notifications","Currency & Tax","AI","Document Categories","Tender Categories","Integrations","Security"].map((item) => (
          <div key={item} className="rounded-xl border bg-background p-4">
            <div className="font-medium">{item}</div>
            <p className="mt-1 text-muted-foreground">Managed in this workspace. Country default: {COUNTRIES.find((c) => c.code === ctx.membership.country)?.name}.</p>
          </div>
        ))}
      </div>
      <form action={logoutAction} className="mt-6">
        <Button type="submit" variant="outline">Sign out</Button>
      </form>
    </div>
  );
}
