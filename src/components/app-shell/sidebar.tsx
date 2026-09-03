"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem =
  | { href: string; label: string; icon: React.ComponentType<{ className?: string }> }
  | {
      label: string;
      items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
    };

const NAV: NavItem[] = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  {
    label: "Sales & Opportunities",
    items: [
      { href: "/app/opportunities", label: "Opportunities", icon: Search },
      { href: "/app/tenders", label: "Tenders", icon: FileText },
    ],
  },
  {
    label: "Orders",
    items: [
      { href: "/app/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
      { href: "/app/deliveries", label: "Deliveries", icon: Truck },
      { href: "/app/grns", label: "GRNs", icon: ClipboardList },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/app/invoices", label: "Invoices", icon: FileText },
      { href: "/app/receivables", label: "Receivables", icon: CircleDollarSign },
      { href: "/app/payments", label: "Payments", icon: Wallet },
    ],
  },
  {
    label: "Procurement",
    items: [
      { href: "/app/rfqs", label: "RFQs", icon: ClipboardList },
      { href: "/app/suppliers", label: "Suppliers", icon: Warehouse },
      { href: "/app/quotations", label: "Quotations", icon: Package },
    ],
  },
  {
    label: "Compliance",
    items: [
      { href: "/app/vault", label: "Company Vault", icon: ShieldCheck },
      { href: "/app/expiry-calendar", label: "Expiry Calendar", icon: CalendarClock },
    ],
  },
  { href: "/app/analytics", label: "Analytics", icon: LayoutDashboard },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
  { href: "/app/customers", label: "Customers", icon: Building2 },
  { href: "/app/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/app/team", label: "Team", icon: Users },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/subscription", label: "Subscription", icon: CircleDollarSign },
];

export function Sidebar({ organizationName }: { organizationName: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
      <div className="border-b px-4 py-4">
        <Link href="/app" className="block">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">SupplierOS</div>
          <div className="mt-1 truncate text-sm font-medium">{organizationName}</div>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV.map((item) =>
          "items" in item ? (
            <div key={item.label} className="mb-3">
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {item.label}
              </div>
              {item.items.map((child) => (
                <NavLink key={child.href} href={child.href} label={child.label} icon={child.icon} active={pathname === child.href || pathname.startsWith(child.href + "/")} />
              ))}
            </div>
          ) : (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={item.href === "/app" ? pathname === "/app" : pathname === item.href || pathname.startsWith(item.href + "/")}
            />
          ),
        )}
      </nav>
    </aside>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "mb-0.5 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
        active ? "bg-sidebar-accent font-medium text-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
