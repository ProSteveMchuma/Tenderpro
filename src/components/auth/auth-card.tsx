import Link from "next/link";
import { Input } from "@/components/ui/input";
import { BrandLockup } from "@/components/brand/logo";
import { APP_TAGLINE } from "@/lib/constants";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-10">
        <BrandLockup href="/" inverted subtitle={APP_TAGLINE} />
        <div>
          <h2 className="font-display max-w-sm text-4xl leading-tight tracking-tight">
            Collect what you have already earned.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-sidebar-foreground/70">
            Tender readiness, GRN gates and overdue invoices in one workspace — so cash does not stall in spreadsheets.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">Kenya · Uganda · Tanzania · Rwanda · Ghana · Nigeria</p>
      </div>
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandLockup href="/" subtitle={APP_TAGLINE} />
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-xs sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  children,
}: {
  label: string;
  name?: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  children?: React.ReactNode;
}) {
  return (
    <label className="mb-3 block text-sm">
      <span className="mb-1.5 block font-medium">{label}</span>
      {children ?? (
        <Input name={name} type={type} required={required} defaultValue={defaultValue} className="h-10" />
      )}
    </label>
  );
}

export function AuthLinks({ left, right }: { left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mt-4 flex justify-between text-sm">
      {left}
      {right}
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-primary hover:underline">
      {children}
    </Link>
  );
}
