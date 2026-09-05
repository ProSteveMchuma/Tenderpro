#!/usr/bin/env node
/**
 * Upsert SupplierOS runtime env vars on the linked Vercel project.
 * Requires VERCEL_TOKEN (https://vercel.com/account/tokens).
 *
 * Usage:
 *   VERCEL_TOKEN=... node scripts/vercel-env.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";

const PROJECT_ID = "prj_umvPHCzYbikwd4eqW2DDZnH04qq7";
const TEAM_ID = "team_2PIw1OwWSrdTxzWsJNE8FYER";
const DASHBOARD = "https://vercel.com/prostevemchumas-projects/tenderpro-l233/settings/environment-variables";

const token = process.env.VERCEL_TOKEN || "";
if (!token) {
  console.error(`Vercel CLI is not logged in from this environment.
Create a token at https://vercel.com/account/tokens then run:

  VERCEL_TOKEN=... node scripts/vercel-env.mjs

Or paste these keys in ${DASHBOARD}

Required:
  SESSION_SECRET
  FIREBASE_SERVICE_ACCOUNT_JSON
  FIRESTORE_DATABASE=tenderpro
  FIREBASE_PROJECT_ID=tenderpro-480721
  FIREBASE_USE_CLOUD=true
  STORAGE_DRIVER=firebase
  DATABASE_DRIVER=firestore
  DEMO_MODE=false          (production)
`);
  process.exit(1);
}

function readServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) {
    return process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
  }
  const filePath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(process.cwd(), ".data/firebase/service-account.json");
  return fs.readFileSync(filePath, "utf8").trim();
}

function sessionSecret() {
  const current = process.env.SESSION_SECRET || "";
  if (current && current !== "replace-with-a-long-random-secret" && current !== "dev-only-change-me") {
    return current;
  }
  return randomBytes(32).toString("base64url");
}

async function vercel(pathname, init) {
  const url = new URL(`https://api.vercel.com${pathname}`);
  url.searchParams.set("teamId", TEAM_ID);
  if (pathname.includes("/env") && init?.method === "POST") {
    url.searchParams.set("upsert", "true");
  }
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${pathname}: ${JSON.stringify(body)}`);
  }
  return body;
}

const serviceAccount = readServiceAccount();
JSON.parse(serviceAccount);
const secret = sessionSecret();

const vars = [
  ["DATABASE_DRIVER", "firestore", ["production", "preview", "development"]],
  ["FIRESTORE_DATABASE", "tenderpro", ["production", "preview", "development"]],
  ["FIREBASE_PROJECT_ID", "tenderpro-480721", ["production", "preview", "development"]],
  ["FIREBASE_USE_CLOUD", "true", ["production", "preview", "development"]],
  ["STORAGE_DRIVER", "firebase", ["production", "preview", "development"]],
  ["DEMO_MODE", "true", ["preview", "development"]],
  ["SESSION_SECRET", secret, ["production", "preview", "development"]],
  ["FIREBASE_SERVICE_ACCOUNT_JSON", serviceAccount, ["production", "preview", "development"]],
];

for (const [key, value, target] of vars) {
  const type = key === "SESSION_SECRET" || key === "FIREBASE_SERVICE_ACCOUNT_JSON" ? "sensitive" : "plain";
  await vercel(`/v10/projects/${PROJECT_ID}/env`, {
    method: "POST",
    body: JSON.stringify({
      key,
      value,
      type,
      target,
    }),
  });
  console.info(`upserted ${key} → ${target.join(",")}`);
}

console.info(
  `done. fingerprint=${createHash("sha256").update(serviceAccount).digest("hex").slice(0, 12)} dashboard=${DASHBOARD}`,
);
