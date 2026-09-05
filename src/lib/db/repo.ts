import "server-only";
import { getDocumentStore } from "@/lib/db/firestore/client";
import {
  DbDoc,
  QueryOptions,
  WhereClause,
  asString,
  moneyString,
  newId,
  nowIso,
} from "@/lib/db/types";

export async function docs(collection: string, options?: QueryOptions) {
  const store = await getDocumentStore();
  return store.query(collection, options);
}

export async function docById(collection: string, id: string) {
  const store = await getDocumentStore();
  return store.get(collection, id);
}

export async function saveDoc(collection: string, id: string, data: Record<string, unknown>) {
  const store = await getDocumentStore();
  const existing = await store.get(collection, id);
  const payload = {
    ...existing,
    ...data,
    id,
    updatedAt: nowIso(),
    createdAt: existing?.createdAt ?? data.createdAt ?? nowIso(),
  };
  await store.set(collection, id, payload);
  return payload as DbDoc;
}

export async function createDoc(collection: string, data: Record<string, unknown>, id = newId()) {
  return saveDoc(collection, id, { ...data, createdAt: nowIso() });
}

export async function patchDoc(collection: string, id: string, data: Record<string, unknown>) {
  const store = await getDocumentStore();
  const existing = await store.get(collection, id);
  if (!existing) throw new Error(`${collection}/${id} not found`);
  const payload = { ...existing, ...data, id, updatedAt: nowIso() };
  await store.set(collection, id, payload);
  return payload;
}

export async function softDeleteDoc(collection: string, id: string) {
  return patchDoc(collection, id, { deletedAt: nowIso() });
}

export async function listByOrg(
  collection: string,
  organizationId: string,
  options?: Omit<QueryOptions, "where"> & { where?: WhereClause[]; includeDeleted?: boolean },
) {
  const where: WhereClause[] = [
    { field: "organizationId", op: "==", value: organizationId },
    ...(options?.where ?? []),
  ];
  let rows = await docs(collection, {
    where,
    orderBy: options?.orderBy,
    limit: options?.limit,
  });
  if (!options?.includeDeleted) {
    rows = rows.filter((row) => !row.deletedAt);
  }
  return rows;
}

export async function getOrgDoc(collection: string, organizationId: string, id: string) {
  const row = await docById(collection, id);
  if (!row || row.organizationId !== organizationId || row.deletedAt) return null;
  return row;
}

export function camelizeInvoice(row: DbDoc) {
  return {
    id: asString(row.id),
    organizationId: asString(row.organizationId),
    customerId: asString(row.customerId, ""),
    purchaseOrderId: row.purchaseOrderId ? asString(row.purchaseOrderId) : null,
    number: asString(row.number),
    issueDate: asString(row.issueDate),
    dueDate: asString(row.dueDate),
    currency: asString(row.currency, "KES"),
    subtotal: moneyString(row.subtotal),
    vat: moneyString(row.vat),
    withholdingTax: moneyString(row.withholdingTax),
    total: moneyString(row.total),
    paidAmount: moneyString(row.paidAmount),
    outstanding: moneyString(row.outstanding),
    etimsReference: row.etimsReference ? asString(row.etimsReference) : null,
    status: asString(row.status),
    nextAction: row.nextAction ? asString(row.nextAction) : null,
    lastFollowUpAt: row.lastFollowUpAt ? asString(row.lastFollowUpAt) : null,
  };
}

export async function nextSequence(organizationId: string, kind: string, prefix: string) {
  const store = await getDocumentStore();
  const id = `${organizationId}:${kind}`;
  const next = await store.increment("sequences", id, "nextNumber", {
    organizationId,
    kind,
  });
  return `${prefix}-${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
}

export async function findProfileByEmail(email: string) {
  const rows = await docs("profiles", {
    where: [{ field: "emailLower", op: "==", value: email.toLowerCase() }],
    limit: 1,
  });
  return rows[0] ?? null;
}
