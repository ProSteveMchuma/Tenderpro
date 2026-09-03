import type { LucideIcon } from "lucide-react";
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
  Sparkles,
  Truck,
  Users,
  Warehouse,
  Wallet,
} from "lucide-react";

export type NavLeaf = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavLeaf[] };
export type NavItem = NavLeaf | NavGroup;

export const NAV: NavItem[] = [
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
  { href: "/app/copilot", label: "Copilot", icon: Sparkles },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
  { href: "/app/customers", label: "Customers", icon: Building2 },
  { href: "/app/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/app/team", label: "Team", icon: Users },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/subscription", label: "Subscription", icon: CircleDollarSign },
];

export const MOBILE_TABS: NavLeaf[] = [
  { href: "/app", label: "Home", icon: LayoutDashboard },
  { href: "/app/tenders", label: "Tenders", icon: FileText },
  { href: "/app/invoices", label: "Invoices", icon: CircleDollarSign },
  { href: "/app/receivables", label: "Collect", icon: Wallet },
];

export function isNavActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`);
}
