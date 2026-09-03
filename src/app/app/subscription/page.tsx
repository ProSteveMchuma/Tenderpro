import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/chrome";
import { PLANS } from "@/lib/entitlements";
import { formatMoney } from "@/lib/money";
import { choosePlanAction } from "@/app/actions/records";
import { Button } from "@/components/ui/button";

export default async function SubscriptionPage() {
  const ctx = await requirePermission("org.read");
  return (
    <div>
      <PageHeader title="Subscription" description={`Current plan: ${ctx.membership.planId}. Billing uses development mode until Paystack or M-Pesa is configured.`} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.values(PLANS).map((plan) => (
          <form key={plan.id} action={choosePlanAction} className={`rounded-xl border bg-background p-4 ${plan.id === ctx.membership.planId ? "ring-2 ring-primary" : ""}`}>
            <div className="text-sm text-muted-foreground">{plan.name}</div>
            <div className="mt-2 text-2xl font-semibold">{formatMoney(plan.monthlyKes, "KES")}</div>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {plan.features.slice(0, 4).map((f) => <li key={f}>{f}</li>)}
            </ul>
            <input type="hidden" name="planId" value={plan.id} />
            <Button type="submit" className="mt-4 w-full" variant={plan.id === ctx.membership.planId ? "outline" : "default"}>
              {plan.id === ctx.membership.planId ? "Current plan" : "Switch in development billing"}
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
