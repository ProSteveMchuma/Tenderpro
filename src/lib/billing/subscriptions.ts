import { listByOrg, patchDoc, createDoc } from "@/lib/db/repo";
import { asString, nowIso } from "@/lib/db/types";
import { BillingCharge, periodEndIso } from "@/lib/billing";

export async function applyPaidSubscription(charge: BillingCharge) {
  const subs = await listByOrg("subscriptions", charge.organizationId, { includeDeleted: true });
  const payload = {
    organizationId: charge.organizationId,
    planId: charge.planId,
    status: "active",
    provider: "paystack",
    providerReference: charge.reference,
    interval: charge.interval,
    currentPeriodEnd: periodEndIso(charge.interval, new Date(charge.paidAt)),
    trialEndsAt: null,
    updatedAt: nowIso(),
  };
  if (subs[0]) {
    await patchDoc("subscriptions", asString(subs[0].id), payload);
  } else {
    await createDoc("subscriptions", payload);
  }
}
