import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/chrome";
import { PLANS } from "@/lib/entitlements";
import { formatMoney } from "@/lib/money";
import { startCheckoutAction } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import { isPaystackEnabled } from "@/lib/billing";
import { remainingTrialDays } from "@/lib/entitlements";

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; error?: string; updated?: string }>;
}) {
  const ctx = await requirePermission("org.read");
  const params = await searchParams;
  const canBill = hasPermission(ctx.membership.role, "org.billing");
  const paystack = isPaystackEnabled();
  const trialDays = remainingTrialDays(ctx.membership.trialEndsAt);
  return (
    <div>
      <PageHeader
        title="Subscription"
        description={`Current plan: ${ctx.membership.planId}. Status: ${ctx.membership.subscriptionStatus ?? "none"}${
          ctx.membership.subscriptionStatus === "trialing" ? ` · ${trialDays} trial day(s) left` : ""
        }. ${paystack ? "Checkout is processed by Paystack in KES." : "Development billing is active until Paystack is configured."}`}
      />
      {params.paid ? <p className="mb-4 text-sm text-emerald-700">Payment received. Your plan is active.</p> : null}
      {params.updated ? <p className="mb-4 text-sm text-emerald-700">Plan updated.</p> : null}
      {params.error ? <p className="mb-4 text-sm text-destructive">Checkout could not be confirmed. Try again or contact support.</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.values(PLANS).map((plan) => (
          <form
            key={plan.id}
            action={startCheckoutAction}
            className={`rounded-xl border bg-background p-4 ${plan.id === ctx.membership.planId ? "ring-2 ring-primary" : ""}`}
          >
            <div className="text-sm text-muted-foreground">{plan.name}</div>
            <div className="mt-2 text-2xl font-semibold">{formatMoney(plan.monthlyKes, "KES")}</div>
            <div className="text-xs text-muted-foreground">per month</div>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {plan.features.slice(0, 4).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <input type="hidden" name="planId" value={plan.id} />
            <label className="mt-3 block text-xs text-muted-foreground">
              Billing interval
              <select name="interval" defaultValue="monthly" className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm">
                <option value="monthly">Monthly · {formatMoney(plan.monthlyKes, "KES")}</option>
                <option value="annual">Annual · {formatMoney(plan.annualKes, "KES")}</option>
              </select>
            </label>
            <Button
              type="submit"
              className="mt-4 w-full"
              variant={plan.id === ctx.membership.planId ? "outline" : "default"}
              disabled={!canBill}
            >
              {!canBill
                ? "Owner billing only"
                : plan.id === ctx.membership.planId
                  ? paystack
                    ? "Renew / keep plan"
                    : "Current plan"
                  : paystack
                    ? "Pay with Paystack"
                    : "Switch in development billing"}
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
