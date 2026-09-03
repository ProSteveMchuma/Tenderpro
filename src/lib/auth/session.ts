import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { query, queryOne } from "@/lib/db/client";
import { bootstrapDatabase } from "@/lib/db/bootstrap";
import { Role } from "@/lib/constants";
import { Permission, assertPermission, hasPermission } from "@/lib/permissions";

const COOKIE = "sos_session";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  country: string;
};

export type Membership = {
  organizationId: string;
  role: Role;
  organizationName: string;
  currency: string;
  timezone: string;
  country: string;
  vatRate: string;
  onboardingCompletedAt: string | null;
  planId: string;
  trialEndsAt: string | null;
  subscriptionStatus: string | null;
};

export type AuthContext = {
  user: SessionUser;
  membership: Membership;
  memberships: Membership[];
};

type TokenPayload = {
  userId: string;
  organizationId: string;
  exp: number;
};

function secret() {
  return process.env.SESSION_SECRET || "dev-only-change-me";
}

function sign(payload: TokenPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token: string): TokenPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as TokenPayload;
  if (payload.exp < Date.now()) return null;
  return payload;
}

export async function setSession(userId: string, organizationId: string) {
  const token = sign({
    userId,
    organizationId,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 14,
  });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function readSession(): Promise<TokenPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    return verify(token);
  } catch {
    return null;
  }
}

export async function getMemberships(userId: string): Promise<Membership[]> {
  return query<Membership>(
    `select m.organization_id as "organizationId",
            m.role,
            o.name as "organizationName",
            o.currency,
            o.timezone,
            o.country,
            o.vat_rate::text as "vatRate",
            o.onboarding_completed_at as "onboardingCompletedAt",
            coalesce(s.plan_id, 'business') as "planId",
            s.trial_ends_at as "trialEndsAt",
            s.status as "subscriptionStatus"
     from organization_members m
     join organizations o on o.id = m.organization_id
     left join subscriptions s on s.organization_id = o.id
     where m.user_id = $1 and m.status = 'active' and m.deleted_at is null and o.deleted_at is null
     order by o.name`,
    [userId],
  );
}

export async function getAuthContext(): Promise<AuthContext | null> {
  await bootstrapDatabase();
  const session = await readSession();
  if (!session) return null;
  const user = await queryOne<SessionUser>(
    `select id, email, full_name as "fullName", phone, country
     from profiles where id = $1 and deleted_at is null`,
    [session.userId],
  );
  if (!user) return null;
  const memberships = await getMemberships(user.id);
  const membership =
    memberships.find((item) => item.organizationId === session.organizationId) ?? memberships[0];
  if (!membership) return null;
  return { user, membership, memberships };
}

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    const error = new Error("Authentication required");
    error.name = "UnauthorizedError";
    throw error;
  }
  return ctx;
}

export async function requirePermission(permission: Permission): Promise<AuthContext> {
  const ctx = await requireAuth();
  assertPermission(ctx.membership.role, permission);
  return ctx;
}

export function can(ctx: AuthContext, permission: Permission) {
  return hasPermission(ctx.membership.role, permission);
}

export async function verifyPassword(email: string, password: string) {
  const user = await queryOne<SessionUser & { passwordHash: string | null }>(
    `select id, email, full_name as "fullName", phone, country, password_hash as "passwordHash"
     from profiles where lower(email) = lower($1) and deleted_at is null`,
    [email],
  );
  if (!user?.passwordHash) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  await query("update profiles set last_sign_in_at = now() where id = $1", [user.id]);
  return user;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function assertSameOrganization(ctx: AuthContext, organizationId: string) {
  if (ctx.membership.organizationId !== organizationId) {
    const error = new Error("Tenant isolation violation");
    error.name = "ForbiddenError";
    throw error;
  }
}
