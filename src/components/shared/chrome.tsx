import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { Inbox } from "lucide-react";
import { ButtonLink } from "@/components/shared/button-link";

export function humanize(value: string) {
  return value.replaceAll("_", " ");
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h1 className="text-[1.65rem] font-semibold tracking-tight text-balance">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  href,
  actionLabel,
  icon: Icon = Inbox,
}: {
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-card px-6 py-14 text-center shadow-xs">
      <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4.5" />
      </span>
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {href && actionLabel ? (
        <ButtonLink href={href} className="mt-4">
          {actionLabel}
        </ButtonLink>
      ) : null}
    </div>
  );
}

export function MoneyText({
  amount,
  currency,
  className,
}: {
  amount: string | number | null | undefined;
  currency: string;
  className?: string;
}) {
  return <span className={cn("tabular-nums", className)}>{formatMoney(amount ?? "0", currency)}</span>;
}

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const normalized = value.toLowerCase();
  const tone =
    /paid|complete|awarded|active|valid|signed|delivered|ready|approved|accepted/.test(normalized)
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-900"
      : /overdue|expired|missing|rejected|lost|danger|blocked|disputed/.test(normalized)
        ? "bg-red-50 text-red-800 ring-red-200/80 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-900"
        : /expir|pending|awaiting|review|warning|draft|preparing|sourcing/.test(normalized)
          ? "bg-amber-50 text-amber-900 ring-amber-200/80 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-900"
          : "bg-muted text-foreground ring-border";
  const dot =
    /paid|complete|awarded|active|valid|signed|delivered|ready|approved|accepted/.test(normalized)
      ? "bg-emerald-500"
      : /overdue|expired|missing|rejected|lost|danger|blocked|disputed/.test(normalized)
        ? "bg-red-500"
        : /expir|pending|awaiting|review|warning|draft|preparing|sourcing/.test(normalized)
          ? "bg-amber-500"
          : "bg-muted-foreground/50";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset",
        tone,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot)} />
      {humanize(value)}
    </span>
  );
}

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs", className)}>{children}</div>
  );
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function AlertBanner({
  tone = "warning",
  title,
  children,
}: {
  tone?: "danger" | "warning" | "info" | "success";
  title: string;
  children?: React.ReactNode;
}) {
  const styles = {
    danger: "border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100",
    warning: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
    info: "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
    success: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3", styles[tone])}>
      <div className="text-sm font-semibold">{title}</div>
      {children ? <div className="mt-1 text-sm leading-6 opacity-90">{children}</div> : null}
    </div>
  );
}

export function Meter({ value, className }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = clamped < 50 ? "bg-red-500" : clamped < 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className={cn("flex min-w-24 items-center gap-2", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${clamped}%` }} />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{clamped}%</span>
    </div>
  );
}

export function AgeingBar({
  buckets,
  currency,
}: {
  buckets: Record<string, string>;
  currency: string;
}) {
  const entries = Object.entries(buckets);
  const total = entries.reduce((sum, [, amount]) => sum + Number(amount || 0), 0) || 1;
  const colors = ["bg-emerald-500", "bg-amber-400", "bg-orange-500", "bg-red-500"];
  return (
    <div className="space-y-3">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {entries.map(([bucket, amount], index) => (
          <div
            key={bucket}
            className={colors[index] ?? "bg-muted-foreground"}
            style={{ width: `${(Number(amount || 0) / total) * 100}%` }}
            title={`${bucket}: ${formatMoney(amount, currency)}`}
          />
        ))}
      </div>
      <div className="space-y-2">
        {entries.map(([bucket, amount], index) => (
          <div key={bucket} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className={cn("size-2 rounded-full", colors[index])} />
              {bucket} days
            </span>
            <span className="tabular-nums">{formatMoney(amount, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "danger" | "warning" | "success";
}) {
  const accent =
    tone === "danger"
      ? "text-red-700 dark:text-red-300"
      : tone === "warning"
        ? "text-amber-800 dark:text-amber-200"
        : tone === "success"
          ? "text-emerald-700 dark:text-emerald-300"
          : "text-foreground";
  const iconWrap =
    tone === "danger"
      ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
      : tone === "warning"
        ? "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
        : tone === "success"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          : "bg-primary/10 text-primary";
  const inner = (
    <div className="flex h-full flex-col rounded-xl border border-border/80 bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn("flex size-8 items-center justify-center rounded-lg", iconWrap)}>
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p className={cn("mt-3 text-2xl font-semibold tracking-tight tabular-nums", accent)}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block transition-transform hover:-translate-y-px">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function AttentionRow({
  title,
  href,
  tone,
  actionLabel = "Open",
}: {
  title: string;
  href: string;
  tone: "danger" | "warning" | "info";
  actionLabel?: string;
}) {
  const styles = {
    danger: "border-red-200/80 bg-red-50/80 hover:bg-red-50 dark:border-red-900 dark:bg-red-950/30",
    warning: "border-amber-200/80 bg-amber-50/70 hover:bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
    info: "border-border bg-muted/30 hover:bg-muted/50",
  };
  return (
    <Link href={href} className={cn("flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors", styles[tone])}>
      <span className="text-sm leading-5">{title}</span>
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{actionLabel}</span>
    </Link>
  );
}
