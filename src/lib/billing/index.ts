export type BillingCheckout = {
  organizationId: string;
  planId: string;
  interval: "monthly" | "annual";
};

export interface BillingProvider {
  name: string;
  createCheckout(input: BillingCheckout): Promise<{ url: string }>;
}

class DevelopmentBilling implements BillingProvider {
  name = "development";
  async createCheckout(input: BillingCheckout) {
    return { url: `/app/settings/billing?simulatedPlan=${input.planId}&interval=${input.interval}` };
  }
}

export function getBillingProvider(): BillingProvider {
  return new DevelopmentBilling();
}
