"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction } from "@/app/actions/auth";
import { AuthCard, Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { COUNTRIES } from "@/lib/constants";

export default function SignupPage() {
  const [state, action] = useActionState(signUpAction, null);
  return (
    <AuthCard title="Start your 14-day trial" subtitle="We’ll create your organization automatically.">
      <form action={action}>
        <Field label="Full name" name="fullName" required />
        <Field label="Company name" name="companyName" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Phone number" name="phone" required />
        <Field label="Country">
          <select name="country" defaultValue="KE" className="h-9 w-full rounded-lg border bg-background px-3 text-sm">
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Password" name="password" type="password" required />
        {state?.error ? <p className="mb-2 text-sm text-destructive">{state.error}</p> : null}
        <Button type="submit" nativeButton className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-4 text-sm">
        Already registered?{" "}
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
