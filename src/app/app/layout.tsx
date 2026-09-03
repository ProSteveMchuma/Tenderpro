import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { remainingTrialDays } from "@/lib/entitlements";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!ctx.membership.onboardingCompletedAt) redirect("/onboarding");
  const trialDays = remainingTrialDays(ctx.membership.trialEndsAt);
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
        {ctx.membership.subscriptionStatus === "trialing" ? (
          <div className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
            Business trial · {trialDays} day{trialDays === 1 ? "" : "s"} remaining.{" "}
            <Link href="/app/subscription" className="font-medium underline">
              Upgrade
            </Link>
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
