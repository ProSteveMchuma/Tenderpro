import { redirect } from "next/navigation";
import Link from "next/link";
import { clearSession, getAuthContext } from "@/lib/auth/session";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { remainingTrialDays } from "@/lib/entitlements";
import { isDemoMode } from "@/lib/config/runtime";
import { subscriptionAllowsWrites } from "@/lib/auth/subscription";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) {
    await clearSession();
    redirect("/login");
  }
  if (!isDemoMode() && !ctx.user.emailVerifiedAt) redirect("/verify-email");
  if (!ctx.membership.onboardingCompletedAt) redirect("/onboarding");
  const trialDays = remainingTrialDays(ctx.membership.trialEndsAt);
  const writesAllowed = subscriptionAllowsWrites(ctx);
  const trialing = ctx.membership.subscriptionStatus === "trialing";
  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar organizationName={ctx.membership.organizationName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={ctx.user.fullName}
          currentOrgId={ctx.membership.organizationId}
          memberships={ctx.memberships.map((item) => ({
            organizationId: item.organizationId,
            organizationName: item.organizationName,
          }))}
        />
        {trialing && trialDays > 0 ? (
          <div className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
            Business trial · {trialDays} day{trialDays === 1 ? "" : "s"} remaining.{" "}
            <Link href="/app/subscription" className="font-medium underline">
              Upgrade
            </Link>
          </div>
        ) : null}
        {!writesAllowed ? (
          <div className="border-b bg-destructive/10 px-4 py-2 text-sm">
            {trialing ? "Your trial has ended." : "Your subscription is not active."} You can still view records, but
            changes are locked until you{" "}
            <Link href="/app/subscription" className="font-medium underline">
              choose a plan
            </Link>
            .
          </div>
        ) : null}
        <main className="flex-1 px-4 py-6 lg:px-8">
          <nav className="mb-4 flex gap-2 overflow-x-auto pb-2 text-sm lg:hidden">
            {[
              ["/app", "Overview"],
              ["/app/tenders", "Tenders"],
              ["/app/invoices", "Invoices"],
              ["/app/receivables", "Receivables"],
              ["/app/vault", "Vault"],
              ["/app/purchase-orders", "POs"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="whitespace-nowrap rounded-full border px-3 py-1">
                {label}
              </Link>
            ))}
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}
