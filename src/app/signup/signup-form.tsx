"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction } from "@/app/actions/auth";
import { AuthCard, Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { COUNTRIES } from "@/lib/constants";

export function SignupForm({ inviteToken }: { inviteToken: string }) {
  const [state, action] = useActionState(signUpAction, null);
  const invited = Boolean(inviteToken);
  return (
    <AuthCard
      title={invited ? "Accept your invite" : "Start your 14-day trial"}
      subtitle={invited ? "Create an account with the email this invite was sent to." : "We’ll create your organization automatically."}
    >
      <form action={action}>
        {invited ? <input type="hidden" name="inviteToken" value={inviteToken} /> : null}
        <Field label="Full name" name="fullName" required />
        {invited ? null : <Field label="Company name" name="companyName" required />}
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
        <Button type="submit" className="w-full">
          {invited ? "Join workspace" : "Create account"}
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
