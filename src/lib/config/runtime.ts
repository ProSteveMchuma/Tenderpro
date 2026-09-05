export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function isNextBuildPhase() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function isDemoMode() {
  if (process.env.DEMO_MODE === "true") return true;
  if (process.env.DEMO_MODE === "false") return false;
  return !isProduction();
}

export function appUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercelHost = (process.env.VERCEL_URL || process.env.VERCEL_BRANCH_URL || "").replace(
    /^https?:\/\//,
    "",
  );
  if (vercelHost) return `https://${vercelHost.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function sessionSecret() {
  const value = process.env.SESSION_SECRET || "";
  if (isProduction() && (!value || value === "replace-with-a-long-random-secret" || value === "dev-only-change-me")) {
    throw new Error("SESSION_SECRET must be set to a long random value in production.");
  }
  return value || "dev-only-change-me";
}

export function assertProductionConfig() {
  if (!isProduction() || isNextBuildPhase()) return;
  sessionSecret();
  if (process.env.DATABASE_DRIVER === "firestore" || !process.env.DATABASE_DRIVER) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH is required in production.");
    }
  }
  if (appUrl() === "http://localhost:3000") {
    throw new Error("NEXT_PUBLIC_APP_URL or VERCEL_URL is required in production.");
  }
}
