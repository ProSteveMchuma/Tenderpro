"use client";

import { useState } from "react";
import { PLANS } from "@/lib/entitlements";
import { formatMoney } from "@/lib/money";
import { ButtonLink } from "@/components/shared/button-link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader current="pricing" />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pricing</p>
        <h1 className="font-display mt-3 text-4xl tracking-tight lg:text-5xl">Simple plans for supplier teams</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">Annual billing gives you 2 months free. Start with a 14-day Business trial.</p>
        <div className="mt-6 inline-flex rounded-lg border bg-card p-1 text-sm shadow-xs">
          <button
            type="button"
            className={cn("rounded-md px-3 py-1.5", !annual && "bg-primary text-primary-foreground")}
            onClick={() => setAnnual(false)}
          >
            Monthly
          </button>
          <button
            type="button"
            className={cn("rounded-md px-3 py-1.5", annual && "bg-primary text-primary-foreground")}
            onClick={() => setAnnual(true)}
          >
            Annual
          </button>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.values(PLANS).map((plan) => {
            const amount = annual ? plan.annualKes / 12 : plan.monthlyKes;
            return (
              <div
                key={plan.id}
                className={cn(
                  "flex flex-col rounded-xl border bg-card p-5 shadow-xs",
                  plan.highlighted && "ring-2 ring-primary",
                )}
              >
                {plan.highlighted ? (
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Most popular</div>
                ) : null}
                <h2 className="mt-2 text-xl font-semibold">{plan.name}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                <div className="mt-4 text-3xl font-semibold tabular-nums">{formatMoney(amount.toFixed(2), "KES")}</div>
                <div className="text-xs text-muted-foreground">{annual ? "effective monthly, billed annually" : "billed monthly"}</div>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <ButtonLink href="/signup" className="mt-6 w-full">
                  Choose {plan.name}
                </ButtonLink>
              </div>
            );
          })}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
