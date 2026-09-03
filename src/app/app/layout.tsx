import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { remainingTrialDays } from "@/lib/entitlements";
import { ButtonLink } from "@/components/shared/button-link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!ctx.membership.onboardingCompletedAt) redirect("/onboarding");
  const trialDays = remainingTrialDays(ctx.membership.trialEndsAt);
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar organizationName={ctx.membership.organizationName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={ctx.user.fullName}
          organizationName={ctx.membership.organizationName}
          currentOrgId={ctx.membership.organizationId}
          memberships={ctx.memberships.map((item) => ({
            organizationId: item.organizationId,
            organizationName: item.organizationName,
          }))}
        />
        {ctx.membership.subscriptionStatus === "trialing" ? (
          <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <p>
              Business trial · <span className="font-medium">{trialDays} day{trialDays === 1 ? "" : "s"} remaining</span>
            </p>
            <ButtonLink href="/app/subscription" size="sm" variant="outline" className="border-amber-300 bg-white/70">
              Upgrade
            </ButtonLink>
          </div>
        ) : null}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-8">{children}</main>
      </div>
    </div>
  );
}
