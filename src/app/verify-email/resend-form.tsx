"use client";

import { useActionState } from "react";
import { resendVerificationAction } from "@/app/actions/auth";
import { Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export function VerifyEmailResend() {
  const [state, action] = useActionState(resendVerificationAction, null);
  return (
    <form action={action}>
      <Field label="Email" name="email" type="email" required />
      <Button type="submit" className="w-full">
        Resend verification email
      </Button>
      {state?.ok ? <p className="mt-3 text-sm text-emerald-700">If that account exists and is unverified, we sent a new link.</p> : null}
      {state?.error ? <p className="mt-3 text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
