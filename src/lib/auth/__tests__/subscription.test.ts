import { describe, expect, it } from "vitest";
import type { AuthContext } from "@/lib/auth/session";
import { assertSubscriptionAllowsWrites, subscriptionAllowsWrites } from "@/lib/auth/subscription";

function ctx(status: string, trialEndsAt: string | null): AuthContext {
  return {
    user: {
      id: "u1",
      email: "owner@example.com",
      fullName: "Owner",
      phone: null,
      country: "KE",
      emailVerifiedAt: "2026-01-01T00:00:00.000Z",
    },
    membership: {
      organizationId: "org1",
      role: "owner",
      organizationName: "Acme",
      currency: "KES",
      timezone: "Africa/Nairobi",
      country: "KE",
      vatRate: "16.00",
      onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
      planId: "business",
      trialEndsAt,
      subscriptionStatus: status,
    },
    memberships: [],
  };
}

describe("subscription gate", () => {
  const now = new Date("2026-09-04T12:00:00.000Z");

  it("allows active subscriptions", () => {
    expect(subscriptionAllowsWrites(ctx("active", null), now)).toBe(true);
  });

  it("allows a trial that has not ended", () => {
    expect(subscriptionAllowsWrites(ctx("trialing", "2026-09-10T00:00:00.000Z"), now)).toBe(true);
  });

  it("blocks an expired trial and past-due plans", () => {
    expect(subscriptionAllowsWrites(ctx("trialing", "2026-08-01T00:00:00.000Z"), now)).toBe(false);
    expect(subscriptionAllowsWrites(ctx("past_due", null), now)).toBe(false);
    expect(() => assertSubscriptionAllowsWrites(ctx("canceled", null))).toThrow(/subscription is not active/);
  });
});
