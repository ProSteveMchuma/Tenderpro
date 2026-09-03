import { Role } from "@/lib/constants";

export const PERMISSIONS = [
  "org.read",
  "org.update",
  "org.billing",
  "org.transfer_ownership",
  "team.read",
  "team.invite",
  "team.manage",
  "customers.read",
  "customers.write",
  "opportunities.read",
  "opportunities.write",
  "tenders.read",
  "tenders.write",
  "vault.read",
  "vault.write",
  "purchase_orders.read",
  "purchase_orders.write",
  "deliveries.read",
  "deliveries.write",
  "grns.read",
  "grns.write",
  "invoices.read",
  "invoices.write",
  "payments.read",
  "payments.write",
  "receivables.read",
  "receivables.write",
  "suppliers.read",
  "suppliers.write",
  "rfqs.read",
  "rfqs.write",
  "quotations.read",
  "quotations.write",
  "tasks.read",
  "tasks.write",
  "notifications.read",
  "analytics.read",
  "settings.read",
  "settings.write",
  "ai.use",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

const READ_ALL = PERMISSIONS.filter(
  (permission) => permission.endsWith(".read") || permission === "ai.use",
);

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL,
  admin: ALL.filter(
    (permission) =>
      permission !== "org.billing" && permission !== "org.transfer_ownership",
  ),
  procurement: [
    "org.read",
    "team.read",
    "customers.read",
    "customers.write",
    "opportunities.read",
    "opportunities.write",
    "tenders.read",
    "tenders.write",
    "vault.read",
    "purchase_orders.read",
    "purchase_orders.write",
    "suppliers.read",
    "suppliers.write",
    "rfqs.read",
    "rfqs.write",
    "quotations.read",
    "quotations.write",
    "tasks.read",
    "tasks.write",
    "notifications.read",
    "analytics.read",
    "settings.read",
    "ai.use",
  ],
  finance: [
    "org.read",
    "team.read",
    "customers.read",
    "invoices.read",
    "invoices.write",
    "payments.read",
    "payments.write",
    "receivables.read",
    "receivables.write",
    "purchase_orders.read",
    "vault.read",
    "tasks.read",
    "tasks.write",
    "notifications.read",
    "analytics.read",
    "settings.read",
    "ai.use",
  ],
  operations: [
    "org.read",
    "team.read",
    "customers.read",
    "purchase_orders.read",
    "deliveries.read",
    "deliveries.write",
    "grns.read",
    "grns.write",
    "vault.read",
    "tasks.read",
    "tasks.write",
    "notifications.read",
    "analytics.read",
    "settings.read",
    "ai.use",
  ],
  viewer: READ_ALL.filter((permission) => permission !== "ai.use"),
};

export function permissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return permissionsForRole(role).includes(permission);
}

export function assertPermission(role: Role | null | undefined, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    const error = new Error("You do not have permission to perform this action.");
    error.name = "ForbiddenError";
    throw error;
  }
}
