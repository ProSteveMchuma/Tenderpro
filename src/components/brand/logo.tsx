import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

export function BrandMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg",
        inverted ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-primary text-primary-foreground",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-4.5" fill="none">
        <path d="M5 7.5h10.5a1.5 1.5 0 0 1 1.5 1.5v9H8A3 3 0 0 1 5 15V7.5Z" fill="currentColor" opacity="0.35" />
        <path d="M7.5 4h9A2.5 2.5 0 0 1 19 6.5V16h-9A2.5 2.5 0 0 1 7.5 13.5V4Z" fill="currentColor" />
        <path d="M10 8h6M10 11h4.5" stroke={inverted ? "oklch(0.18 0.03 250)" : "white"} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function BrandLockup({
  href = "/",
  inverted = false,
  subtitle,
  compact = false,
}: {
  href?: string;
  inverted?: boolean;
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-2.5">
      <BrandMark inverted={inverted} />
      <span className="min-w-0">
        <span className={cn("block truncate font-semibold tracking-tight", compact ? "text-sm" : "text-[15px]")}>
          {APP_NAME}
        </span>
        {subtitle ? (
          <span className={cn("block truncate text-xs", inverted ? "text-sidebar-foreground/60" : "text-muted-foreground")}>
            {subtitle}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
