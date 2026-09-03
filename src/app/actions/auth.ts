"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { COUNTRIES, TRIAL_DAYS } from "@/lib/constants";
import { query, queryOne } from "@/lib/db/client";
import { bootstrapDatabase } from "@/lib/db/bootstrap";
import {
  clearSession,
  getMemberships,
  hashPassword,
  requireAuth,
  setSession,
  verifyPassword,
} from "@/lib/auth/session";
import { addDaysIso } from "@/lib/dates";
import { getEmailProvider } from "@/lib/email";
import { createHash } from "node:crypto";

const signupSchema = z.object({
  fullName: z.string().min(2),
  companyName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  country: z.string().min(2),
  phone: z.string().min(6),
});

export async function signUpAction(formData: FormData) {
  await bootstrapDatabase();
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    password: formData.get("password"),
    country: formData.get("country"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: "Please complete all required fields with a valid email and 8+ character password." };
  }
  const existing = await queryOne("select id from profiles where lower(email) = lower($1)", [parsed.data.email]);
  if (existing) return { error: "An account with this email already exists." };

  const country = COUNTRIES.find((item) => item.code === parsed.data.country) ?? COUNTRIES[0];
  const userId = crypto.randomUUID();
  const orgId = crypto.randomUUID();
  const passwordHash = await hashPassword(parsed.data.password);

  await query(
    `insert into profiles (id, email, full_name, phone, country, password_hash, email_verified_at)
     values ($1,$2,$3,$4,$5,$6,now())`,
    [userId, parsed.data.email.toLowerCase(), parsed.data.fullName, parsed.data.phone, country.code, passwordHash],
  );
  await query(
    `insert into organizations (id, name, legal_name, trading_name, country, currency, timezone, vat_rate, phone, email, created_by)
     values ($1,$2,$2,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      orgId,
      parsed.data.companyName,
      country.code,
      country.currency,
      country.timezone,
      country.vat,
      parsed.data.phone,
      parsed.data.email.toLowerCase(),
      userId,
    ],
  );
  await query(
    `insert into organization_members (id, organization_id, user_id, role, status)
     values (gen_random_uuid(),$1,$2,'owner','active')`,
    [orgId, userId],
  );
  await query(
    `insert into subscriptions (id, organization_id, plan_id, status, trial_ends_at, current_period_end, provider)
     values (gen_random_uuid(),$1,'business','trialing',$2,$2,'development')`,
    [orgId, addDaysIso(new Date(), TRIAL_DAYS)],
  );
  await query(`insert into organization_settings (organization_id) values ($1)`, [orgId]);
  await setSession(userId, orgId);
  await getEmailProvider().send({
    to: parsed.data.email,
    subject: "Welcome to SupplierOS Africa",
    html: `<p>Your 14-day Business trial is active.</p>`,
    text: "Your 14-day Business trial is active.",
  });
  redirect("/onboarding");
}

export async function loginAction(formData: FormData) {
  await bootstrapDatabase();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const user = await verifyPassword(email, password);
  if (!user) return { error: "Invalid email or password." };
  const memberships = await getMemberships(user.id);
  if (memberships.length === 0) return { error: "This account is not assigned to an organization." };
  await setSession(user.id, memberships[0].organizationId);
  if (!memberships[0].onboardingCompletedAt) redirect("/onboarding");
  redirect("/app");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function switchOrganizationAction(formData: FormData) {
  const ctx = await requireAuth();
  const organizationId = String(formData.get("organizationId") || "");
  const allowed = ctx.memberships.some((item) => item.organizationId === organizationId);
  if (!allowed) throw new Error("You are not a member of that organization.");
  await setSession(ctx.user.id, organizationId);
  redirect("/app");
}

export async function forgotPasswordAction(formData: FormData) {
  await bootstrapDatabase();
  const email = String(formData.get("email") || "");
  const user = await queryOne<{ id: string; email: string }>(
    "select id, email from profiles where lower(email) = lower($1)",
    [email],
  );
  if (user) {
    const token = crypto.randomUUID();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await query(
      `insert into password_reset_tokens (id, user_id, token_hash, expires_at)
       values (gen_random_uuid(),$1,$2, now() + interval '2 hours')`,
      [user.id, tokenHash],
    );
    const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    await getEmailProvider().send({
      to: user.email,
      subject: "Reset your SupplierOS password",
      html: `<p>Reset your password: <a href="${url}">${url}</a></p>`,
      text: `Reset your password: ${url}`,
    });
  }
  return { ok: true };
}

export async function resetPasswordAction(formData: FormData) {
  await bootstrapDatabase();
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const row = await queryOne<{ id: string; user_id: string }>(
    `select id, user_id from password_reset_tokens
     where token_hash = $1 and used_at is null and expires_at > now()`,
    [tokenHash],
  );
  if (!row) return { error: "This reset link is invalid or has expired." };
  const passwordHash = await hashPassword(password);
  await query("update profiles set password_hash = $1, updated_at = now() where id = $2", [
    passwordHash,
    row.user_id,
  ]);
  await query("update password_reset_tokens set used_at = now() where id = $1", [row.id]);
  return { ok: true };
}

export async function completeOnboardingAction(formData: FormData) {
  const ctx = await requireAuth();
  const orgId = ctx.membership.organizationId;
  const goals = formData.getAll("goals").map(String);
  await query(
    `update organizations set
      legal_name = $1, trading_name = $2, registration_number = $3, tax_pin = $4,
      country = $5, currency = $6, vat_registered = $7, phone = $8, email = $9,
      website = $10, address = $11, business_type = $12, onboarding_goals = $13::jsonb,
      onboarding_completed_at = now(), updated_at = now()
     where id = $14`,
    [
      String(formData.get("legalName") || ctx.membership.organizationName),
      String(formData.get("tradingName") || ""),
      String(formData.get("registrationNumber") || ""),
      String(formData.get("taxPin") || ""),
      String(formData.get("country") || "KE"),
      String(formData.get("currency") || "KES"),
      formData.get("vatRegistered") === "on" || formData.get("vatRegistered") === "true",
      String(formData.get("phone") || ""),
      String(formData.get("email") || ctx.user.email),
      String(formData.get("website") || ""),
      String(formData.get("address") || ""),
      String(formData.get("businessType") || "General Supplier"),
      JSON.stringify(goals),
      orgId,
    ],
  );
  redirect("/app");
}
