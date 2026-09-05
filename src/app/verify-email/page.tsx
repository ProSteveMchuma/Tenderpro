import Link from "next/link";
import { verifyEmailAction } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmailResend } from "./resend-form";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailAction(token) : null;
  return (
    <AuthCard
      title="Verify your email"
      subtitle={
        result?.ok
          ? "Your email is confirmed. You can sign in."
          : result?.error ||
            "Check your inbox for a confirmation link. In development the link is printed to the server log."
      }
    >
      {result?.ok ? (
        <Link
          href="/login"
          className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground"
        >
          Sign in
        </Link>
      ) : (
        <VerifyEmailResend />
      )}
    </AuthCard>
  );
}
