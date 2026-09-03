import { PLAN_IDS, PLAN_PRICES_KES, PlanId } from "@/lib/constants";

export type EntitlementKey =
  | "users"
  | "aiAnalysesPerMonth"
  | "activeTenders"
  | "storageBytes"
  | "invoicesPerMonth"
  | "clients"
  | "suppliers";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  description: string;
  monthlyKes: number;
  annualKes: number;
  highlighted?: boolean;
  entitlements: Record<EntitlementKey, number>;
  features: string[];
};

const UNLIMITED = Number.POSITIVE_INFINITY;

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    description: "For small suppliers getting tenders and invoices under control.",
    monthlyKes: PLAN_PRICES_KES.starter.monthly,
    annualKes: PLAN_PRICES_KES.starter.annual,
    entitlements: {
      users: 3,
      aiAnalysesPerMonth: 20,
      activeTenders: 10,
      storageBytes: 1 * 1024 * 1024 * 1024,
      invoicesPerMonth: 50,
      clients: 25,
      suppliers: 25,
    },
    features: [
      "Company vault & expiry reminders",
      "Tender workspace",
      "Invoices and receivables",
      "Email notifications",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    description: "The operating workspace for growing supplier teams.",
    monthlyKes: PLAN_PRICES_KES.business.monthly,
    annualKes: PLAN_PRICES_KES.business.annual,
    highlighted: true,
    entitlements: {
      users: 10,
      aiAnalysesPerMonth: 100,
      activeTenders: 50,
      storageBytes: 10 * 1024 * 1024 * 1024,
      invoicesPerMonth: 300,
      clients: 100,
      suppliers: 100,
    },
    features: [
      "Everything in Starter",
      "AI tender analysis & compliance matching",
      "PO → delivery → GRN → invoice lifecycle",
      "Receivables follow-ups",
      "Team roles",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For high-volume suppliers managing complex bid and collection work.",
    monthlyKes: PLAN_PRICES_KES.pro.monthly,
    annualKes: PLAN_PRICES_KES.pro.annual,
    entitlements: {
      users: 25,
      aiAnalysesPerMonth: 500,
      activeTenders: UNLIMITED,
      storageBytes: 50 * 1024 * 1024 * 1024,
      invoicesPerMonth: UNLIMITED,
      clients: UNLIMITED,
      suppliers: UNLIMITED,
    },
    features: [
      "Everything in Business",
      "Unlimited active tenders",
      "Quotation scoring",
      "Advanced analytics",
      "Priority document processing",
    ],
  },
  consultant: {
    id: "consultant",
    name: "Consultant",
    description: "For procurement consultants operating multiple supplier teams.",
    monthlyKes: PLAN_PRICES_KES.consultant.monthly,
    annualKes: PLAN_PRICES_KES.consultant.annual,
    entitlements: {
      users: 50,
      aiAnalysesPerMonth: 2000,
      activeTenders: UNLIMITED,
      storageBytes: 100 * 1024 * 1024 * 1024,
      invoicesPerMonth: UNLIMITED,
      clients: UNLIMITED,
      suppliers: UNLIMITED,
    },
    features: [
      "Everything in Pro",
      "High-volume AI analyses",
      "Larger teams",
      "Consultant workspace limits",
    ],
  },
};

export function getPlan(planId: string | null | undefined): PlanDefinition {
  if (planId && PLAN_IDS.includes(planId as PlanId)) {
    return PLANS[planId as PlanId];
  }
  return PLANS.business;
}

export function isUnlimited(value: number): boolean {
  return !Number.isFinite(value);
}

export function remainingTrialDays(trialEndsAt: string | Date | null | undefined, now = new Date()): number {
  if (!trialEndsAt) return 0;
  const end = typeof trialEndsAt === "string" ? new Date(trialEndsAt) : trialEndsAt;
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function canUseEntitlement(
  planId: string,
  key: EntitlementKey,
  currentUsage: number,
): { allowed: boolean; limit: number; remaining: number } {
  const limit = getPlan(planId).entitlements[key];
  if (isUnlimited(limit)) {
    return { allowed: true, limit, remaining: UNLIMITED };
  }
  const remaining = Math.max(0, limit - currentUsage);
  return { allowed: currentUsage < limit, limit, remaining };
}

export function assertEntitlement(planId: string, key: EntitlementKey, currentUsage: number, message?: string) {
  const result = canUseEntitlement(planId, key, currentUsage);
  if (!result.allowed) {
    const error = new Error(message ?? "Your current plan does not allow this action. Upgrade to continue.");
    error.name = "EntitlementError";
    throw error;
  }
  return result;
}
