import { requirePermission } from "@/lib/auth/session";
import { PageHeader, Panel } from "@/components/shared/chrome";
import { updateSettingsAction } from "@/app/actions/records";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/actions/auth";
import { COUNTRIES, CURRENCIES, DEFAULT_TIMEZONE } from "@/lib/constants";
import { ButtonLink } from "@/components/shared/button-link";

export default async function SettingsPage() {
  const ctx = await requirePermission("settings.read");
  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" description="Organization, currency, tax and security controls." />
      <Panel className="p-6">
        <form action={updateSettingsAction}>
          <Field label="Organization name" name="name" defaultValue={ctx.membership.organizationName} />
          <Field label="Timezone" name="timezone" defaultValue={ctx.membership.timezone || DEFAULT_TIMEZONE} />
          <Field label="Currency">
            <select name="currency" defaultValue={ctx.membership.currency} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="VAT rate" name="vatRate" defaultValue={ctx.membership.vatRate} />
          <Field label="Reminder days JSON" name="reminderDays" defaultValue="[90,60,30,14,7,1]" />
          <Button type="submit">Save settings</Button>
        </form>
      </Panel>
      <div className="mt-6 grid gap-3 text-sm md:grid-cols-2">
        {[
          ["Organization", "Profile and company identity"],
          ["Team", "/app/team"],
          ["Billing", "/app/subscription"],
          ["Security", "Roles, sessions and isolation"],
        ].map(([item, extra]) =>
          extra.startsWith("/") ? (
            <ButtonLink key={item} href={extra} variant="outline" className="h-auto justify-start px-4 py-3 text-left">
              <span>
                <span className="block font-medium">{item}</span>
                <span className="block text-xs font-normal text-muted-foreground">Open {item.toLowerCase()}</span>
              </span>
            </ButtonLink>
          ) : (
            <Panel key={item} className="p-4">
              <div className="font-medium">{item}</div>
              <p className="mt-1 text-muted-foreground">
                {extra}. Country default: {COUNTRIES.find((c) => c.code === ctx.membership.country)?.name}.
              </p>
            </Panel>
          ),
        )}
      </div>
      <form action={logoutAction} className="mt-6">
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
