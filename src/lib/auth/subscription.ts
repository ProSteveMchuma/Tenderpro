import type { AuthContext } from "@/lib/auth/session";
import { remainingTrialDays } from "@/lib/entitlements";

export function subscriptionAllowsWrites(ctx: AuthContext, now = new Date()) {
  const status = ctx.membership.subscriptionStatus;
  if (status === "active") return true;
  if (status === "trialing") return remainingTrialDays(ctx.membership.trialEndsAt, now) > 0;
  return false;
}

export function assertSubscriptionAllowsWrites(ctx: AuthContext) {
  if (subscriptionAllowsWrites(ctx)) return;
  const error = new Error("Your trial or subscription is not active. Upgrade to continue making changes.");
  error.name = "SubscriptionError";
  throw error;
}
