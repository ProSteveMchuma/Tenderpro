"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "@/app/actions/auth";
import { AuthCard, Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(forgotPasswordAction, null);
  return (
    <AuthCard title="Forgot password" subtitle="If the account exists, we’ll send a reset link. In development this is printed to the server log.">
      <form action={action}>
        <Field label="Email" name="email" type="email" required />
        <Button type="submit" className="w-full">
          Send reset link
        </Button>
      </form>
      {state?.ok ? <p className="mt-3 text-sm text-emerald-700">Check your email, or the development console.</p> : null}
    </AuthCard>
  );
}
