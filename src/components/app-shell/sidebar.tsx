"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/brand/logo";
import { isNavActive, NAV, type NavLeaf } from "@/components/app-shell/nav";

export function Sidebar({ organizationName }: { organizationName: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-[16.5rem] shrink-0 bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
      <div className="border-b border-sidebar-border px-4 py-4">
        <BrandLockup href="/app" inverted subtitle={organizationName} compact />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
        {NAV.map((item) =>
          "items" in item ? (
            <div key={item.label} className="mb-4">
              <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
                {item.label}
              </div>
              {item.items.map((child) => (
                <NavLink key={child.href} item={child} active={isNavActive(pathname, child.href)} />
              ))}
            </div>
          ) : (
            <NavLink key={item.href} item={item} active={isNavActive(pathname, item.href)} />
          ),
        )}
      </nav>
      <div className="border-t border-sidebar-border px-4 py-3 text-[11px] text-sidebar-foreground/45">
        From tender to payment
      </div>
    </aside>
  );
}

export function NavLink({ item, active }: { item: NavLeaf; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-sidebar-primary" : "opacity-80")} />
      {item.label}
    </Link>
  );
}
