"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { COUNTRIES, TRIAL_DAYS } from "@/lib/constants";
import { bootstrapDatabase } from "@/lib/db/bootstrap";
import { getDatabaseDriver } from "@/lib/db/client";
import { createDoc, docs, findProfileByEmail, patchDoc, saveDoc } from "@/lib/db/repo";
import { asString, newId, nowIso } from "@/lib/db/types";
import {
  clearSession,
  getAuthContext,
  getMemberships,
  hashPassword,
  requireAuth,
  setSession,
  verifyPassword,
} from "@/lib/auth/session";
import { hashToken, randomToken } from "@/lib/auth/tokens";
import { addDaysIso } from "@/lib/dates";
import { getEmailProvider } from "@/lib/email";
import { appUrl, isDemoMode } from "@/lib/config/runtime";
import { rateLimit } from "@/lib/rate-limit";
import { clientKey } from "@/lib/request";

const signupSchema = z.object({
  fullName: z.string().min(2),
  companyName: z.string().min(2).optional(),
  email: z.string().email(),
  password: z.string().min(8),
  country: z.string().min(2),
  phone: z.string().min(6),
  inviteToken: z.string().optional(),
});

function limited(result: { ok: boolean }): { error: string } | null {
  if (!result.ok) return { error: "Too many attempts. Please wait a minute and try again." };
  return null;
}

export type AuthFormState = {
  error?: string;
  ok?: boolean;
  unverified?: boolean;
};

async function sendVerificationEmail(email: string, userId: string) {
  const token = randomToken();
  await createDoc("email_verification_tokens", {
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    usedAt: null,
  });
  const url = `${appUrl()}/verify-email?token=${token}`;
  await getEmailProvider().send({
    to: email,
    subject: "Verify your SupplierOS email",
    html: `<p>Confirm your email to activate your workspace: <a href="${url}">${url}</a></p>`,
    text: `Confirm your email: ${url}`,
  });
}

async function findInvite(token: string) {
  const tokenHash = hashToken(token);
  const rows = await docs("organization_members", {
    where: [{ field: "tokenHash", op: "==", value: tokenHash }],
    limit: 5,
  });
  return rows.find((row) => asString(row.status) === "invited" && !row.deletedAt) ?? null;
}

export async function signUpAction(
  _prev: AuthFormState | null,
  formData: FormData,
): Promise<AuthFormState> {
  await bootstrapDatabase();
  const blocked = limited(rateLimit(await clientKey("signup"), 8, 10 * 60_000));
  if (blocked) return blocked;

  const inviteToken = String(formData.get("inviteToken") || "").trim();
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    companyName: String(formData.get("companyName") || "").trim() || (inviteToken ? "Invited" : undefined),
    email: formData.get("email"),
    password: formData.get("password"),
    country: formData.get("country"),
    phone: formData.get("phone"),
    inviteToken: inviteToken || undefined,
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
  const email = parsed.data.email.toLowerCase();
  const passwordHash = await hashPassword(parsed.data.password);
  const verifiedAt = isDemoMode() ? nowIso() : null;

  const invite = inviteToken ? await findInvite(inviteToken) : null;
  if (inviteToken && !invite) return { error: "This invite link is invalid or has expired." };
  if (invite && asString(invite.invitedEmail).toLowerCase() !== email) {
    return { error: "Use the email address this invite was sent to." };
  }
  if (invite?.expiresAt && new Date(asString(invite.expiresAt)).getTime() < Date.now()) {
    return { error: "This invite link has expired." };
  }

  await saveDoc("profiles", userId, {
    email,
    emailLower: email,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    country: country.code,
    passwordHash,
    emailVerifiedAt: verifiedAt,
    deletedAt: null,
  });

  let orgId = invite ? asString(invite.organizationId) : newId();
  if (!invite) {
    const companyName = parsed.data.companyName || "My company";
    await saveDoc("organizations", orgId, {
      name: companyName,
      legalName: companyName,
      tradingName: companyName,
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
  } else {
    await patchDoc("organization_members", asString(invite.id), {
      userId,
      status: "active",
      invitedEmail: email,
      tokenHash: null,
    });
  }

  await setSession(userId, orgId);
  if (!verifiedAt) {
    await sendVerificationEmail(email, userId);
    redirect("/verify-email");
  }
  await getEmailProvider().send({
    to: email,
    subject: "Welcome to SupplierOS Africa",
    html: `<p>Your 14-day Business trial is active.</p>`,
    text: "Your 14-day Business trial is active.",
  });
  if (invite) redirect("/app");
  redirect("/onboarding");
}

export async function loginAction(_prev: AuthFormState | null, formData: FormData): Promise<AuthFormState> {
  await bootstrapDatabase();
  const blocked = limited(rateLimit(await clientKey("login"), 10, 10 * 60_000));
  if (blocked) return blocked;
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const user = await verifyPassword(email, password);
  if (!user) return { error: "Invalid email or password." };
  if (!isDemoMode() && !user.emailVerifiedAt) {
    return { error: "Verify your email before signing in. Check your inbox for the link.", unverified: true };
  }
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

export async function forgotPasswordAction(_prev: AuthFormState | null, formData: FormData): Promise<AuthFormState> {
  await bootstrapDatabase();
  const blocked = limited(rateLimit(await clientKey("forgot"), 5, 10 * 60_000));
  if (blocked) return blocked;
  const email = String(formData.get("email") || "");
  const user = await findProfileByEmail(email);
  if (user) {
    const token = randomToken();
    await createDoc("password_reset_tokens", {
      userId: asString(user.id),
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      usedAt: null,
    });
    const url = `${appUrl()}/reset-password?token=${token}`;
    await getEmailProvider().send({
      to: asString(user.email),
      subject: "Reset your SupplierOS password",
      html: `<p>Reset your password: <a href="${url}">${url}</a></p>`,
      text: `Reset your password: ${url}`,
    });
  }
  return { ok: true };
}

export async function resetPasswordAction(_prev: AuthFormState | null, formData: FormData): Promise<AuthFormState> {
  await bootstrapDatabase();
  const blocked = limited(rateLimit(await clientKey("reset"), 8, 10 * 60_000));
  if (blocked) return blocked;
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  const tokenHash = hashToken(token);
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

export async function verifyEmailAction(token: string) {
  await bootstrapDatabase();
  const tokenHash = hashToken(token);
  const rows = await docs("email_verification_tokens", {
    where: [{ field: "tokenHash", op: "==", value: tokenHash }],
    limit: 5,
  });
  const row = rows.find((item) => !item.usedAt && new Date(asString(item.expiresAt)).getTime() > Date.now());
  if (!row) return { error: "This verification link is invalid or has expired." };
  await patchDoc("profiles", asString(row.userId), { emailVerifiedAt: nowIso() });
  await patchDoc("email_verification_tokens", asString(row.id), { usedAt: nowIso() });
  return { ok: true };
}

export async function resendVerificationAction(_prev: AuthFormState | null, formData: FormData): Promise<AuthFormState> {
  await bootstrapDatabase();
  const blocked = limited(rateLimit(await clientKey("verify"), 5, 10 * 60_000));
  if (blocked) return blocked;
  const email = String(formData.get("email") || "").toLowerCase();
  const profile = await findProfileByEmail(email);
  if (profile && !profile.emailVerifiedAt) {
    await sendVerificationEmail(asString(profile.email), asString(profile.id));
  }
  return { ok: true };
}

export async function acceptInviteAction(token: string) {
  const ctx = await getAuthContext();
  await bootstrapDatabase();
  const invite = await findInvite(token);
  if (!invite) return { error: "This invite link is invalid or has expired." };
  if (invite.expiresAt && new Date(asString(invite.expiresAt)).getTime() < Date.now()) {
    return { error: "This invite link has expired." };
  }
  if (!ctx) {
    redirect(`/signup?invite=${encodeURIComponent(token)}`);
  }
  if (ctx.user.email.toLowerCase() !== asString(invite.invitedEmail).toLowerCase()) {
    return { error: "Sign in with the email address this invite was sent to." };
  }
  await patchDoc("organization_members", asString(invite.id), {
    userId: ctx.user.id,
    status: "active",
    tokenHash: null,
  });
  await setSession(ctx.user.id, asString(invite.organizationId));
  redirect("/app");
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
