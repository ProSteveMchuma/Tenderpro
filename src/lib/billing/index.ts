import { createHmac, timingSafeEqual } from "node:crypto";
import { PLAN_IDS, PLAN_PRICES_KES, PlanId } from "@/lib/constants";
import { isProduction } from "@/lib/config/runtime";

export type BillingCheckout = {
  organizationId: string;
  userEmail: string;
  planId: string;
  interval: "monthly" | "annual";
};

export type BillingCharge = {
  organizationId: string;
  planId: PlanId;
  interval: "monthly" | "annual";
  reference: string;
  amount: number;
  paidAt: string;
};

export interface BillingProvider {
  name: string;
  createCheckout(input: BillingCheckout): Promise<{ url: string }>;
}

export function paystackSecret() {
  return process.env.PAYSTACK_SECRET_KEY || "";
}

export function isPaystackEnabled() {
  return Boolean(paystackSecret()) && (process.env.BILLING_PROVIDER === "paystack" || isProduction());
}

export function planAmountKes(planId: string, interval: "monthly" | "annual") {
  const id = (PLAN_IDS.includes(planId as PlanId) ? planId : "business") as PlanId;
  return interval === "annual" ? PLAN_PRICES_KES[id].annual : PLAN_PRICES_KES[id].monthly;
}

export function periodEndIso(interval: "monthly" | "annual", from = new Date()) {
  const end = new Date(from);
  if (interval === "annual") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end.toISOString();
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || paystackSecret();
  if (!secret || !signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

class DevelopmentBilling implements BillingProvider {
  name = "development";
  async createCheckout(input: BillingCheckout) {
    return {
      url: `/app/subscription?simulatedPlan=${encodeURIComponent(input.planId)}&interval=${input.interval}`,
    };
  }
}

class PaystackBilling implements BillingProvider {
  name = "paystack";
  async createCheckout(input: BillingCheckout) {
    const secret = paystackSecret();
    if (!secret) throw new Error("PAYSTACK_SECRET_KEY is not configured.");
    const planId = (PLAN_IDS.includes(input.planId as PlanId) ? input.planId : "business") as PlanId;
    const amountKes = planAmountKes(planId, input.interval);
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.userEmail,
        amount: amountKes * 100,
        currency: "KES",
        callback_url: `${appUrl}/api/billing/paystack/callback`,
        metadata: {
          organizationId: input.organizationId,
          planId,
          interval: input.interval,
        },
      }),
    });
    const payload = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string };
    };
    if (!response.ok || !payload.status || !payload.data?.authorization_url) {
      throw new Error(payload.message || "Could not start Paystack checkout.");
    }
    return { url: payload.data.authorization_url };
  }
}

export async function verifyPaystackReference(reference: string) {
  const secret = paystackSecret();
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const payload = (await response.json()) as {
    status?: boolean;
    data?: {
      status?: string;
      reference?: string;
      amount?: number;
      paid_at?: string;
      metadata?: { organizationId?: string; planId?: string; interval?: string };
    };
  };
  if (!response.ok || !payload.status || payload.data?.status !== "success" || !payload.data) {
    return null;
  }
  const planId = payload.data.metadata?.planId;
  const interval = payload.data.metadata?.interval === "annual" ? "annual" : "monthly";
  if (!payload.data.metadata?.organizationId || !planId || !PLAN_IDS.includes(planId as PlanId)) {
    return null;
  }
  return {
    organizationId: payload.data.metadata.organizationId,
    planId: planId as PlanId,
    interval,
    reference: payload.data.reference || reference,
    amount: Number(payload.data.amount || 0) / 100,
    paidAt: payload.data.paid_at || new Date().toISOString(),
  } satisfies BillingCharge;
}

export function getBillingProvider(): BillingProvider {
  if (isPaystackEnabled()) return new PaystackBilling();
  if (isProduction()) {
    throw new Error("Paystack must be configured in production (PAYSTACK_SECRET_KEY).");
  }
  return new DevelopmentBilling();
}
