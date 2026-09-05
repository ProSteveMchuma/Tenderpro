import { NextRequest, NextResponse } from "next/server";
import { bootstrapDatabase } from "@/lib/db/bootstrap";
import { verifyPaystackReference } from "@/lib/billing";
import { applyPaidSubscription } from "@/lib/billing/subscriptions";
import { appUrl } from "@/lib/config/runtime";

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") || request.nextUrl.searchParams.get("trxref");
  if (!reference) {
    return NextResponse.redirect(`${appUrl()}/app/subscription?error=missing_reference`);
  }
  await bootstrapDatabase();
  const charge = await verifyPaystackReference(reference);
  if (!charge) {
    return NextResponse.redirect(`${appUrl()}/app/subscription?error=unpaid`);
  }
  await applyPaidSubscription(charge);
  return NextResponse.redirect(`${appUrl()}/app/subscription?paid=1`);
}
