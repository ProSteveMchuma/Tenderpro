"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS } from "@/lib/entitlements";
import { formatMoney } from "@/lib/money";

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-semibold">
          SupplierOS Africa
        </Link>
        <Link href="/signup" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">
          Start Free Trial
        </Link>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-4xl font-semibold">Simple plans for supplier teams</h1>
        <p className="mt-3 text-muted-foreground">Annual billing gives you 2 months free.</p>
        <div className="mt-6 inline-flex rounded-lg border p-1 text-sm">
          <button className={`rounded-md px-3 py-1 ${!annual ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setAnnual(false)}>
            Monthly
          </button>
          <button className={`rounded-md px-3 py-1 ${annual ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setAnnual(true)}>
            Annual
          </button>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.values(PLANS).map((plan) => {
            const amount = annual ? plan.annualKes / 12 : plan.monthlyKes;
            return (
              <div key={plan.id} className={`flex flex-col rounded-xl border p-5 ${plan.highlighted ? "ring-2 ring-primary" : ""}`}>
                {plan.highlighted ? <div className="text-xs font-medium uppercase tracking-wide">Most popular</div> : null}
                <h2 className="mt-2 text-xl font-semibold">{plan.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-4 text-3xl font-semibold">{formatMoney(amount.toFixed(2), "KES")}</div>
                <div className="text-xs text-muted-foreground">{annual ? "effective monthly, billed annually" : "billed monthly"}</div>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link href="/signup" className="mt-6 rounded-lg bg-primary px-3 py-2 text-center text-sm text-primary-foreground">
                  Choose {plan.name}
                </Link>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
