import path from "node:path";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { resolveDriver } from "@/lib/db/types";

export type SqlClient = {
  query: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>;
  exec: (text: string) => Promise<void>;
  dialect: "pglite" | "postgres";
};

type GlobalDb = {
  client?: SqlClient;
  ready?: Promise<SqlClient>;
};

const globalForDb = globalThis as typeof globalThis & { __supplierosDb?: GlobalDb };

export async function getSql(): Promise<SqlClient> {
  const driver = resolveDriver();
  if (driver === "firestore") {
    throw new Error(
      "SQL client is unavailable while DATABASE_DRIVER=firestore. Use src/lib/db/repo.ts helpers instead.",
    );
  }
  if (globalForDb.__supplierosDb?.client) return globalForDb.__supplierosDb.client;
  if (!globalForDb.__supplierosDb) globalForDb.__supplierosDb = {};
  if (!globalForDb.__supplierosDb.ready) {
    globalForDb.__supplierosDb.ready = createClient(driver);
  }
  const client = await globalForDb.__supplierosDb.ready;
  globalForDb.__supplierosDb.client = client;
  return client;
}

async function createClient(driver: "postgres" | "pglite"): Promise<SqlClient> {
  if (driver === "postgres" || process.env.DATABASE_URL) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required when DATABASE_DRIVER=postgres.");
    }
    const postgres = (await import("postgres")).default;
    const sql = postgres(process.env.DATABASE_URL, { max: 5 });
    return {
      dialect: "postgres",
      async query<T>(text: string, params: unknown[] = []) {
        const result = await sql.unsafe(text, params as never[]);
        return { rows: result as unknown as T[] };
      },
      async exec(text: string) {
        await sql.unsafe(text);
      },
    };
  }

  const dataDir = path.join(process.cwd(), ".data", "supplieros");
  await fs.mkdir(dataDir, { recursive: true });
  const pglite = new PGlite(dataDir);
  await pglite.waitReady;
  return {
    dialect: "pglite",
    async query<T>(text: string, params: unknown[] = []) {
      const result = await pglite.query<T>(text, params);
      return { rows: result.rows };
    },
    async exec(text: string) {
      await pglite.exec(text);
    },
  };
}

/** @deprecated Prefer Firestore repo helpers when DATABASE_DRIVER=firestore */
export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const sql = await getSql();
  const result = await sql.query<T>(text, params);
  return result.rows;
}

/** @deprecated Prefer Firestore repo helpers when DATABASE_DRIVER=firestore */
export async function queryOne<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export function getDatabaseDriver() {
  return resolveDriver();
}
