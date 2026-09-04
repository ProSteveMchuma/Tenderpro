import { headers } from "next/headers";

export async function clientKey(prefix: string) {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for") || headerList.get("x-real-ip") || "local";
  const ip = forwarded.split(",")[0]?.trim() || "local";
  return `${prefix}:${ip}`;
}
