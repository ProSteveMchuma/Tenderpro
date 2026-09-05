import { NextResponse } from "next/server";
import { appUrl } from "@/lib/config/runtime";

export async function GET() {
  return NextResponse.redirect(new URL("/app", appUrl()));
}
