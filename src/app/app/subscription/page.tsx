import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/chrome";
import { PLANS } from "@/lib/entitlements";
import { formatMoney } from "@/lib/money";
import { choosePlanAction } from "@/app/actions/records";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function SubscriptionPage() {
  const ctx = await requirePermission("org.read");
  return (
    <div>
      <PageHeader
        title="Subscription"
        description={`Current plan: ${ctx.membership.planId}. Billing uses development mode until Paystack or M-Pesa is configured.`}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.values(PLANS).map((plan) => (
          <form
            key={plan.id}
            action={choosePlanAction}
            className={cn(
              "flex flex-col rounded-xl border bg-card p-5 shadow-xs",
              plan.id === ctx.membership.planId && "ring-2 ring-primary",
            )}
          >
            <div className="text-sm text-muted-foreground">{plan.name}</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{formatMoney(plan.monthlyKes, "KES")}</div>
            <ul className="mt-3 flex-1 space-y-1.5 text-sm text-muted-foreground">
              {plan.features.slice(0, 4).map((f) => (
                <li key={f} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
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
