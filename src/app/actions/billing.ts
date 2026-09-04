"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { listByOrg, patchDoc } from "@/lib/db/repo";
import { asString } from "@/lib/db/types";
import { getBillingProvider, isPaystackEnabled, periodEndIso } from "@/lib/billing";
import { PLAN_IDS, PlanId } from "@/lib/constants";
import { revalidatePath } from "next/cache";

export async function startCheckoutAction(formData: FormData) {
  const ctx = await requirePermission("org.billing");
  const planId = String(formData.get("planId") || "");
  const interval = String(formData.get("interval") || "monthly") === "annual" ? "annual" : "monthly";
  if (!PLAN_IDS.includes(planId as PlanId)) {
    throw new Error("Choose a valid plan.");
  }
  const provider = getBillingProvider();
  if (!isPaystackEnabled() && provider.name === "development") {
    const subs = await listByOrg("subscriptions", ctx.membership.organizationId);
    if (subs[0]) {
      await patchDoc("subscriptions", asString(subs[0].id), {
        planId,
        status: "active",
        provider: "development",
        interval,
        currentPeriodEnd: periodEndIso(interval),
      });
    }
    revalidatePath("/app/subscription");
    redirect("/app/subscription?updated=1");
  }
  const checkout = await provider.createCheckout({
    organizationId: ctx.membership.organizationId,
    userEmail: ctx.user.email,
    planId,
    interval,
  });
  redirect(checkout.url);
}
