"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { AuthCard, Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [state, action] = useActionState(async (_prev: { error?: string } | null, formData: FormData) => loginAction(formData), null);
  return (
    <AuthCard title="Sign in" subtitle="Use your work email. Demo: steve@acmesupplies.ke / DemoPass123!">
      <form action={action} className="space-y-1">
        <Field label="Email" name="email" type="email" required defaultValue="steve@acmesupplies.ke" />
        <Field label="Password" name="password" type="password" required defaultValue="DemoPass123!" />
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <Button type="submit" className="mt-2 w-full">
          Sign in
        </Button>
      </form>
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
