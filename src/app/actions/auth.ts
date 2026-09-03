"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createHash } from "node:crypto";
import { COUNTRIES, TRIAL_DAYS } from "@/lib/constants";
import { bootstrapDatabase } from "@/lib/db/bootstrap";
import { getDatabaseDriver } from "@/lib/db/client";
import { createDoc, docs, findProfileByEmail, patchDoc, saveDoc } from "@/lib/db/repo";
import { asString, newId, nowIso } from "@/lib/db/types";
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

  if (getDatabaseDriver() !== "firestore") {
    return { error: "Signup currently requires DATABASE_DRIVER=firestore in this build." };
  }

  const existing = await findProfileByEmail(parsed.data.email);
  if (existing) return { error: "An account with this email already exists." };

  const country = COUNTRIES.find((item) => item.code === parsed.data.country) ?? COUNTRIES[0];
  const userId = newId();
  const orgId = newId();
  const passwordHash = await hashPassword(parsed.data.password);
  const email = parsed.data.email.toLowerCase();

  await saveDoc("profiles", userId, {
    email,
    emailLower: email,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    country: country.code,
    passwordHash,
    emailVerifiedAt: nowIso(),
    deletedAt: null,
  });
  await saveDoc("organizations", orgId, {
    name: parsed.data.companyName,
    legalName: parsed.data.companyName,
    tradingName: parsed.data.companyName,
    country: country.code,
    currency: country.currency,
    timezone: country.timezone,
    vatRate: country.vat,
    phone: parsed.data.phone,
    email,
    createdBy: userId,
    onboardingCompletedAt: null,
    deletedAt: null,
  });
  await createDoc("organization_members", {
    organizationId: orgId,
    userId,
    role: "owner",
    status: "active",
    deletedAt: null,
  });
  await createDoc("subscriptions", {
    organizationId: orgId,
    planId: "business",
    status: "trialing",
    trialEndsAt: addDaysIso(new Date(), TRIAL_DAYS),
    currentPeriodEnd: addDaysIso(new Date(), TRIAL_DAYS),
    provider: "development",
  });
  await saveDoc("organization_settings", orgId, {
    organizationId: orgId,
    reminderDays: [90, 60, 30, 14, 7, 1],
  });

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
  const user = await findProfileByEmail(email);
  if (user) {
    const token = newId();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await createDoc("password_reset_tokens", {
      userId: asString(user.id),
      tokenHash,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      usedAt: null,
    });
    const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    await getEmailProvider().send({
      to: asString(user.email),
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
  const rows = await docs("password_reset_tokens", {
    where: [{ field: "tokenHash", op: "==", value: tokenHash }],
    limit: 5,
  });
  const row = rows.find((item) => !item.usedAt && new Date(asString(item.expiresAt)).getTime() > Date.now());
  if (!row) return { error: "This reset link is invalid or has expired." };
  const passwordHash = await hashPassword(password);
  await patchDoc("profiles", asString(row.userId), { passwordHash });
  await patchDoc("password_reset_tokens", asString(row.id), { usedAt: nowIso() });
  return { ok: true };
}

export async function completeOnboardingAction(formData: FormData) {
  const ctx = await requireAuth();
  const orgId = ctx.membership.organizationId;
  const goals = formData.getAll("goals").map(String);
  await patchDoc("organizations", orgId, {
    legalName: String(formData.get("legalName") || ctx.membership.organizationName),
    tradingName: String(formData.get("tradingName") || ""),
    registrationNumber: String(formData.get("registrationNumber") || ""),
    taxPin: String(formData.get("taxPin") || ""),
    country: String(formData.get("country") || "KE"),
    currency: String(formData.get("currency") || "KES"),
    vatRegistered: formData.get("vatRegistered") === "on" || formData.get("vatRegistered") === "true",
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ctx.user.email),
    website: String(formData.get("website") || ""),
    address: String(formData.get("address") || ""),
    businessType: String(formData.get("businessType") || "General Supplier"),
    onboardingGoals: goals,
    onboardingCompletedAt: nowIso(),
  });
  redirect("/app");
}
