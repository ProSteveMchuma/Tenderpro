import Link from "next/link";
import { APP_NAME, APP_TAGLINE, PLAN_PRICES_KES } from "@/lib/constants";
import { PLANS } from "@/lib/entitlements";
import { formatMoney } from "@/lib/money";
import { isDemoMode } from "@/lib/config/runtime";

const problems = [
  "Tender requirements scatter across PDFs, WhatsApp and email.",
  "Compliance certificates expire and bids get disqualified.",
  "POs are delivered but GRNs are missing, so invoices stall.",
  "Overdue invoices sit in spreadsheets until cash dries up.",
];

const features = [
  { title: "Tender Management", body: "Capture closing dates, submission rules and mandatory documents before a bid is lost." },
  { title: "Compliance Vault", body: "Store certificates once. Match them to every tender and get expiry reminders." },
  { title: "PO-to-Payment Tracking", body: "Follow every award from LPO through delivery, GRN, invoice and collection." },
  { title: "Receivables", body: "See ageing, overdue days and the next follow-up required to collect cash." },
  { title: "AI Procurement Assistant", body: "Extract tender, PO and quotation data, then flag what still needs a human." },
];

const steps = ["Find the opportunity", "Win the bid", "Deliver and collect", "See the profit"];

export default function LandingPage() {
  const demo = isDemoMode();
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div>
          <div className="text-sm font-semibold tracking-tight">{APP_NAME}</div>
          <div className="text-xs text-muted-foreground">{APP_TAGLINE}</div>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
            Pricing
          </Link>
          <Link href="/login" className="text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link href="/signup" className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground">
            Start Free Trial
          </Link>
        </nav>
      </header>
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Africa-first supplier operations</p>
        <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-heading)] text-5xl leading-tight tracking-tight">
          {APP_TAGLINE}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Manage tenders, compliance, purchase orders, deliveries, invoices and payments from one workspace.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
            Start Free Trial
          </Link>
          <Link href="/login" className="rounded-lg border px-4 py-2 text-sm">
            {demo ? "View Demo" : "Sign in"}
          </Link>
        </div>
        {demo ? (
          <p className="mt-3 text-xs text-muted-foreground">Demo login: steve@acmesupplies.ke / DemoPass123!</p>
        ) : null}
      </section>
      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold">The work that loses money</h2>
            <p className="mt-3 text-muted-foreground">
              Most tender tools stop at submit bid. SupplierOS continues through delivery, GRN, invoice and collection.
            </p>
          </div>
          <ul className="space-y-3 text-sm">
            {problems.map((item) => (
              <li key={item} className="rounded-lg border bg-background px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold">Built for Kenyan suppliers, ready for Africa</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((item) => (
            <div key={item.title} className="rounded-xl border p-5">
              <h3 className="font-medium">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step} className="rounded-xl border bg-background p-5">
                <div className="text-xs text-muted-foreground">0{index + 1}</div>
                <div className="mt-2 font-medium">{step}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <p className="mt-2 text-sm text-muted-foreground">14-day Business trial. Annual billing includes 2 months free.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.values(PLANS).map((plan) => (
            <div key={plan.id} className={`rounded-xl border p-5 ${plan.highlighted ? "ring-2 ring-primary" : ""}`}>
              <div className="text-sm text-muted-foreground">{plan.name}</div>
              <div className="mt-2 text-2xl font-semibold">{formatMoney(PLAN_PRICES_KES[plan.id].monthly, "KES")}</div>
              <div className="text-xs text-muted-foreground">per month</div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {plan.features.slice(0, 4).map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Link href="/pricing" className="mt-6 inline-block text-sm underline">
          Compare plans
        </Link>
      </section>
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold">FAQ</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-medium">Does this replace IFMIS or e-procurement portals?</h3>
              <p className="mt-2 text-sm text-muted-foreground">No. SupplierOS is the operating system around those portals: documents, follow-ups and cash collection.</p>
            </div>
            <div>
              <h3 className="font-medium">Is my data isolated?</h3>
              <p className="mt-2 text-sm text-muted-foreground">Yes. Every record is scoped to an organization. Users only see organizations they belong to.</p>
            </div>
          </div>
        </div>
      </section>
      <footer className="border-t px-6 py-8 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3">
          <span>{APP_NAME}</span>
          <nav className="flex gap-4">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
          </nav>
          <span>From Tender to Payment.</span>
        </div>
      </footer>
    </div>
  );
}
