"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, resendVerificationAction } from "@/app/actions/auth";
import { AuthCard, Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export function LoginForm({ demo }: { demo: boolean }) {
  const [state, action] = useActionState(loginAction, null);
  const [resendState, resendAction] = useActionState(resendVerificationAction, null);
  return (
    <AuthCard
      title="Sign in"
      subtitle={demo ? "Use your work email. Demo: steve@acmesupplies.ke / DemoPass123!" : "Use your work email to continue."}
    >
      <form action={action} className="space-y-1">
        <Field
          label="Email"
          name="email"
          type="email"
          required
          defaultValue={demo ? "steve@acmesupplies.ke" : undefined}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          defaultValue={demo ? "DemoPass123!" : undefined}
        />
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <Button type="submit" className="mt-2 w-full">
          Sign in
        </Button>
      </form>
      {state?.unverified ? (
        <form action={resendAction} className="mt-4 rounded-lg border p-3">
          <p className="mb-2 text-sm text-muted-foreground">Need a new verification email?</p>
          <Field label="Email" name="email" type="email" required />
          <Button type="submit" variant="outline" className="w-full">
            Resend verification
          </Button>
          {resendState?.ok ? <p className="mt-2 text-sm text-emerald-700">If that account exists, we sent a new link.</p> : null}
        </form>
      ) : null}
      <div className="mt-4 flex justify-between text-sm">
        <Link href="/forgot-password" className="underline">
          Forgot password
        </Link>
        <Link href="/signup" className="underline">
          Create account
        </Link>
      </div>
    </AuthCard>
  );
}
