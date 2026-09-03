import Link from "next/link";
import { BrandLockup } from "@/components/brand/logo";
import { ButtonLink } from "@/components/shared/button-link";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function MarketingHeader({ current }: { current?: "home" | "pricing" }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <BrandLockup subtitle={APP_TAGLINE} compact />
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/pricing"
            className={cn(
              "hidden rounded-lg px-3 py-1.5 text-muted-foreground hover:text-foreground sm:inline",
              current === "pricing" && "font-medium text-foreground",
            )}
          >
            Pricing
          </Link>
          <ButtonLink href="/login" variant="ghost" size="sm">
            Sign in
          </ButtonLink>
          <ButtonLink href="/signup" size="sm">
            Start free trial
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="font-medium text-foreground">{APP_NAME}</span>
        <span>{APP_TAGLINE} Built for Kenyan suppliers, ready for Africa.</span>
      </div>
    </footer>
  );
}

export function ProductPreview() {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card shadow-xl ring-1 ring-foreground/5">
      <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-red-300" />
        <span className="size-2.5 rounded-full bg-amber-300" />
        <span className="size-2.5 rounded-full bg-emerald-300" />
        <span className="ml-3 text-xs text-muted-foreground">Overview · Acme Supplies Kenya</span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {[
          ["Outstanding", "KES 4,820,000"],
          ["Overdue", "KES 2,400,000"],
          ["Active tenders", "3"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-background p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="mt-1 text-sm font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </div>
      <div className="space-y-2 px-4 pb-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-950">
          Invoice INV-2026-0084 is 14 days overdue · Collect
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          GRN missing for PO-2026-00482 · Record GRN
        </div>
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs">
          KAA/ICT/024/2026 · manufacturer authorization missing
        </div>
      </div>
    </div>
  );
}
