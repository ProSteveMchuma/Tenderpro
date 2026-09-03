"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BrandLockup } from "@/components/brand/logo";
import { NavLink } from "@/components/app-shell/sidebar";
import { isNavActive, MOBILE_TABS, NAV } from "@/components/app-shell/nav";
import { cn } from "@/lib/utils";

export function MobileMenuButton({ organizationName }: { organizationName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 border-border/80 bg-background lg:hidden"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[18rem] bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="border-b border-sidebar-border px-4 py-4">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <BrandLockup href="/app" inverted subtitle={organizationName} compact />
          </SheetHeader>
          <nav className="overflow-y-auto px-3 py-4" onClick={() => setOpen(false)}>
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
        </SheetContent>
      </Sheet>
    </>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
      <div className="grid grid-cols-4">
        {MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isNavActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px]",
                active ? "font-medium text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-4.5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
