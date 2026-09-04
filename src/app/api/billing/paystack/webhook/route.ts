import { NextRequest, NextResponse } from "next/server";
import { bootstrapDatabase } from "@/lib/db/bootstrap";
import { verifyPaystackReference, verifyPaystackSignature } from "@/lib/billing";
import { applyPaidSubscription } from "@/lib/billing/subscriptions";
import { logError } from "@/lib/observability";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  if (!verifyPaystackSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  try {
    const body = JSON.parse(raw) as { event?: string; data?: { reference?: string } };
    if (body.event === "charge.success" && body.data?.reference) {
      await bootstrapDatabase();
      const charge = await verifyPaystackReference(body.data.reference);
      if (charge) await applyPaidSubscription(charge);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    logError("paystack-webhook", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
