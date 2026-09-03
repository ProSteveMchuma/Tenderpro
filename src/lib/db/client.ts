import path from "node:path";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

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

function namedToPostgres(text: string) {
  return text;
}

export async function getSql(): Promise<SqlClient> {
  if (globalForDb.__supplierosDb?.client) return globalForDb.__supplierosDb.client;
  if (!globalForDb.__supplierosDb) globalForDb.__supplierosDb = {};
  if (!globalForDb.__supplierosDb.ready) {
    globalForDb.__supplierosDb.ready = createClient();
  }
  const client = await globalForDb.__supplierosDb.ready;
  globalForDb.__supplierosDb.client = client;
  return client;
}

async function createClient(): Promise<SqlClient> {
  if (process.env.DATABASE_URL) {
    const postgres = (await import("postgres")).default;
    const sql = postgres(process.env.DATABASE_URL, { max: 5 });
    return {
      dialect: "postgres",
      async query<T>(text: string, params: unknown[] = []) {
        const result = await sql.unsafe(namedToPostgres(text), params as never[]);
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

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const sql = await getSql();
  const result = await sql.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
