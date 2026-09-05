import { randomUUID } from "node:crypto";

export type DbDriver = "firestore" | "postgres" | "pglite";

export type DbDoc = Record<string, unknown> & { id: string };

export type WhereOp = "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "array-contains";

export type WhereClause = {
  field: string;
  op: WhereOp;
  value: unknown;
};

export type QueryOptions = {
  where?: WhereClause[];
  orderBy?: { field: string; direction?: "asc" | "desc" }[];
  limit?: number;
};

export interface DocumentStore {
  get(collection: string, id: string): Promise<DbDoc | null>;
  set(collection: string, id: string, data: Record<string, unknown>): Promise<void>;
  update(collection: string, id: string, data: Record<string, unknown>): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  query(collection: string, options?: QueryOptions): Promise<DbDoc[]>;
  increment(
    collection: string,
    id: string,
    field: string,
    extra?: Record<string, unknown>,
  ): Promise<number>;
}

export function newId() {
  return randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

export function asString(value: unknown, fallback = "") {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function moneyString(value: unknown, fallback = "0") {
  if (value == null || value === "") return fallback;
  return String(value);
}

export function matchesWhere(doc: DbDoc, where: WhereClause[] = []) {
  return where.every((clause) => {
    const left = doc[clause.field];
    const right = clause.value;
    switch (clause.op) {
      case "==":
        return left === right || String(left) === String(right);
      case "!=":
        return left !== right && String(left) !== String(right);
      case "<":
        return Number(left) < Number(right) || String(left) < String(right);
      case "<=":
        return Number(left) <= Number(right) || String(left) <= String(right);
      case ">":
        return Number(left) > Number(right) || String(left) > String(right);
      case ">=":
        return Number(left) >= Number(right) || String(left) >= String(right);
      case "in":
        return Array.isArray(right) && right.map(String).includes(String(left));
      case "array-contains":
        return Array.isArray(left) && left.map(String).includes(String(right));
      default:
        return false;
    }
  });
}

export function sortDocs(docs: DbDoc[], orderBy: QueryOptions["orderBy"] = []) {
  if (!orderBy.length) return docs;
  return [...docs].sort((a, b) => {
    for (const rule of orderBy) {
      const av = a[rule.field];
      const bv = b[rule.field];
      if (av == null && bv == null) continue;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      if (cmp !== 0) return rule.direction === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

export function resolveDriver(): DbDriver {
  const explicit = process.env.DATABASE_DRIVER as DbDriver | undefined;
  if (explicit === "firestore" || explicit === "postgres" || explicit === "pglite") return explicit;
  if (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ) {
    return "firestore";
  }
  if (process.env.DATABASE_URL) return "postgres";
  // Default to Firestore local document store for this Firebase migration.
  return "firestore";
}
