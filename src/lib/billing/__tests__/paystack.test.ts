import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { planAmountKes, verifyPaystackSignature } from "@/lib/billing";

describe("Paystack billing helpers", () => {
  const originalSecret = process.env.PAYSTACK_SECRET_KEY;
  const originalWebhook = process.env.PAYSTACK_WEBHOOK_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = originalSecret;
    if (originalWebhook === undefined) delete process.env.PAYSTACK_WEBHOOK_SECRET;
    else process.env.PAYSTACK_WEBHOOK_SECRET = originalWebhook;
  });

  it("converts plan prices for monthly and annual intervals", () => {
    expect(planAmountKes("business", "monthly")).toBeGreaterThan(0);
    expect(planAmountKes("business", "annual")).toBeGreaterThan(planAmountKes("business", "monthly"));
  });

  it("accepts a matching Paystack signature and rejects a mismatch", () => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test_secret";
    delete process.env.PAYSTACK_WEBHOOK_SECRET;
    const raw = JSON.stringify({ event: "charge.success", data: { reference: "ref_1" } });
    const signature = createHmac("sha512", "sk_test_secret").update(raw).digest("hex");
    expect(verifyPaystackSignature(raw, signature)).toBe(true);
    expect(verifyPaystackSignature(raw, "deadbeef")).toBe(false);
    expect(verifyPaystackSignature(raw, null)).toBe(false);
  });
});
