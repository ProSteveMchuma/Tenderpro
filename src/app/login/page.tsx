"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { AuthCard, AuthLinks, Field, TextLink } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [state, action] = useActionState(async (_prev: { error?: string } | null, formData: FormData) => loginAction(formData), null);
  return (
    <AuthCard title="Sign in" subtitle="Use your work email. Demo workspace is prefilled.">
      <form action={action} className="space-y-1">
        <Field label="Email" name="email" type="email" required defaultValue="steve@acmesupplies.ke" />
        <Field label="Password" name="password" type="password" required defaultValue="DemoPass123!" />
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <Button type="submit" className="mt-3 h-10 w-full">
          Sign in
        </Button>
      </form>
      <AuthLinks
        left={<TextLink href="/forgot-password">Forgot password</TextLink>}
        right={<TextLink href="/signup">Create account</TextLink>}
      />
    </AuthCard>
  );
}
