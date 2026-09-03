"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPasswordAction } from "@/app/actions/auth";
import { AuthCard, Field } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

function ResetForm() {
  const params = useSearchParams();
  const [state, action] = useActionState(
    async (_prev: { error?: string; ok?: boolean } | null, formData: FormData) => resetPasswordAction(formData),
    null,
  );
  return (
    <AuthCard title="Reset password">
      <form action={action}>
        <input type="hidden" name="token" value={params.get("token") || ""} />
        <Field label="New password" name="password" type="password" required />
        {state?.error ? <p className="mb-2 text-sm text-destructive">{state.error}</p> : null}
        {state?.ok ? <p className="mb-2 text-sm text-emerald-700">Password updated. You can sign in.</p> : null}
        <Button type="submit" className="w-full">
          Update password
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
