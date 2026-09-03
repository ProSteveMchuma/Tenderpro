import { APP_NAME, APP_TAGLINE, PLAN_PRICES_KES } from "@/lib/constants";
import { PLANS } from "@/lib/entitlements";
import { formatMoney } from "@/lib/money";
import { ButtonLink } from "@/components/shared/button-link";
import { MarketingFooter, MarketingHeader, ProductPreview } from "@/components/marketing/chrome";
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  ShieldCheck,
  Truck,
  Wallet,
  Sparkles,
} from "lucide-react";

const problems = [
  "Tender requirements scatter across PDFs, WhatsApp and email.",
  "Compliance certificates expire and bids get disqualified.",
  "POs are delivered but GRNs are missing, so invoices stall.",
  "Overdue invoices sit in spreadsheets until cash dries up.",
];

const features = [
  { title: "Tender management", body: "Capture closing dates, submission rules and mandatory documents before a bid is lost.", icon: FileSearch },
  { title: "Compliance vault", body: "Store certificates once. Match them to every tender and get expiry reminders.", icon: ShieldCheck },
  { title: "PO-to-payment tracking", body: "Follow every award from LPO through delivery, GRN, invoice and collection.", icon: Truck },
  { title: "Receivables", body: "See ageing, overdue days and the next follow-up required to collect cash.", icon: Wallet },
  { title: "AI procurement assistant", body: "Extract tender, PO and quotation data, then flag what still needs a human.", icon: Sparkles },
];

const steps = [
  { title: "Find the opportunity", body: "Capture tenders and buyers before the close date." },
  { title: "Win the bid", body: "Match vault documents to mandatory requirements." },
  { title: "Deliver and collect", body: "Track LPO, GRN, invoice and follow-up." },
  { title: "See the profit", body: "Know what you earned after costs and delays." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader current="home" />
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_10%_-10%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Africa-first supplier operations</p>
            <h1 className="font-display mt-4 max-w-xl text-5xl leading-[1.08] tracking-tight text-balance lg:text-6xl">
              {APP_TAGLINE}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              Manage tenders, compliance, purchase orders, deliveries, invoices and payments from one workspace built for Kenyan suppliers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" size="lg">
                Start free trial
                <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="/login" variant="outline" size="lg">
                View demo
              </ButtonLink>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              14-day Business trial. Demo: steve@acmesupplies.ke / DemoPass123!
            </p>
            <p className="mt-6 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Kenya · Uganda · Tanzania · Rwanda · Ghana · Nigeria
            </p>
          </div>
          <ProductPreview />
        </div>
      </section>
      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl tracking-tight">The work that loses money</h2>
            <p className="mt-3 max-w-md text-muted-foreground leading-7">
              Most tender tools stop at “submit bid”. {APP_NAME} continues through delivery, GRN, invoice and collection — the operating metric is money collected.
            </p>
          </div>
          <ul className="space-y-3">
            {problems.map((item) => (
              <li key={item} className="rounded-xl border bg-background px-4 py-3 text-sm leading-6 shadow-xs">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-3xl tracking-tight">Built for Kenyan suppliers, ready for Africa</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((item) => (
            <div key={item.title} className="rounded-xl border bg-card p-5 shadow-xs">
              <span className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-4" />
              </span>
              <h3 className="font-medium">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-card">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-3xl tracking-tight">How it works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-xl border bg-background p-5 shadow-xs">
                <div className="text-xs font-semibold text-primary">0{index + 1}</div>
                <div className="mt-2 font-medium">{step.title}</div>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl tracking-tight">Pricing</h2>
            <p className="mt-2 text-sm text-muted-foreground">14-day Business trial. Annual billing includes 2 months free.</p>
          </div>
          <ButtonLink href="/pricing" variant="outline" size="sm">
            Compare plans
          </ButtonLink>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.values(PLANS).map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-col rounded-xl border bg-card p-5 shadow-xs ${plan.highlighted ? "ring-2 ring-primary" : ""}`}
            >
              {plan.highlighted ? (
                <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">Most popular</div>
              ) : null}
              <div className="mt-1 text-sm text-muted-foreground">{plan.name}</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{formatMoney(PLAN_PRICES_KES[plan.id].monthly, "KES")}</div>
              <div className="text-xs text-muted-foreground">per month</div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {plan.features.slice(0, 4).map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <section className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-3xl tracking-tight">FAQ</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-medium">Does this replace IFMIS or e-procurement portals?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                No. SupplierOS is the operating system around those portals: documents, follow-ups and cash collection.
              </p>
            </div>
            <div>
              <h3 className="font-medium">Is my data isolated?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Yes. Every record is scoped to an organization. Users only see organizations they belong to.
              </p>
            </div>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
