"use client";

import { useState } from "react";
import { completeOnboardingAction } from "@/app/actions/auth";
import { BUSINESS_TYPES, COUNTRIES, CURRENCIES, ONBOARDING_GOALS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/auth-card";
import { BrandLockup } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const STEPS = ["Company", "Type", "Goals", "Documents"];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <BrandLockup href="/" subtitle="Set up your workspace" />
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">Set up your company workspace</h1>
        <div className="mt-6 grid grid-cols-4 gap-2">
          {STEPS.map((label, index) => (
            <div key={label}>
              <div className={cn("h-1 rounded-full", index + 1 <= step ? "bg-primary" : "bg-muted")} />
              <p className={cn("mt-2 text-[11px] font-medium", index + 1 === step ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </p>
            </div>
          ))}
        </div>
        <form action={completeOnboardingAction} className="mt-8 rounded-2xl border bg-card p-6 shadow-xs">
          {step === 1 ? (
            <div>
              <h2 className="text-lg font-medium">Company details</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Field label="Legal company name" name="legalName" required />
                <Field label="Trading name" name="tradingName" />
                <Field label="Registration number" name="registrationNumber" />
                <Field label="Tax / PIN number" name="taxPin" />
                <Field label="Country">
                  <select name="country" defaultValue="KE" className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Currency">
                  <select name="currency" defaultValue="KES" className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
                    {CURRENCIES.map((currency) => (
                      <option key={currency}>{currency}</option>
                    ))}
                  </select>
                </Field>
                <label className="mb-3 flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" name="vatRegistered" defaultChecked />
                  VAT registered
                </label>
                <Field label="Phone" name="phone" />
                <Field label="Email" name="email" type="email" />
                <Field label="Website" name="website" />
                <Field label="Address" name="address" />
              </div>
            </div>
          ) : null}
          {step === 2 ? (
            <div>
              <h2 className="text-lg font-medium">Business type</h2>
              <select name="businessType" className="mt-4 h-10 w-full rounded-lg border bg-background px-3 text-sm">
                {BUSINESS_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>
          ) : null}
          {step === 3 ? (
            <div>
              <h2 className="text-lg font-medium">Primary goals</h2>
              <div className="mt-4 grid gap-2">
                {ONBOARDING_GOALS.map((goal) => (
                  <label key={goal.id} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                    <input type="checkbox" name="goals" value={goal.id} defaultChecked />
                    {goal.label}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          {step === 4 ? (
            <div>
              <h2 className="text-lg font-medium">Company documents</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                You can skip this and upload certificates later in Company Vault.
              </p>
            </div>
          ) : null}
          <div className="mt-6 flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep((value) => Math.max(1, value - 1))} disabled={step === 1}>
              Back
            </Button>
            {step < 4 ? (
              <Button type="button" onClick={() => setStep((value) => value + 1)}>
                Continue
              </Button>
            ) : (
              <Button type="submit">Finish and open workspace</Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
