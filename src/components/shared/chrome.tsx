import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  href,
  actionLabel,
}: {
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-card px-6 py-16 text-center">
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {href && actionLabel ? (
        <Link href={href} className="mt-4 inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground">
          {actionLabel}
        </Link>
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

export function StatusBadge({ value }: { value: string }) {
  const tone =
    /paid|complete|awarded|active|valid|signed|delivered/.test(value)
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200"
      : /overdue|expired|missing|rejected|lost|danger|blocked/.test(value)
        ? "bg-red-50 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-200"
        : /expir|pending|awaiting|review|overdue|warning/.test(value)
          ? "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-200"
          : "bg-muted text-foreground ring-border";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset capitalize", tone)}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
