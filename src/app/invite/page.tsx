import Link from "next/link";
import { acceptInviteAction } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <AuthCard title="Invalid invite" subtitle="This invite link is missing a token.">
        <Link href="/signup" className="underline">
          Create an account
        </Link>
      </AuthCard>
    );
  }
  const result = await acceptInviteAction(token);
  return (
    <AuthCard title="Invite" subtitle={result.error}>
      <Link href={`/signup?invite=${encodeURIComponent(token)}`} className="underline">
        Continue to sign up
      </Link>
    </AuthCard>
  );
}
