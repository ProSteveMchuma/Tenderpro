import "server-only";
import {
  DbDoc,
  DocumentStore,
  QueryOptions,
  matchesWhere,
  sortDocs,
  nowIso,
} from "@/lib/db/types";
import { getFirestoreDatabaseId } from "@/lib/firebase/config";
import { getFirebaseAdminApp } from "@/lib/firebase/admin-app";

type GlobalFirebase = {
  store?: DocumentStore;
};

const globalForFb = globalThis as typeof globalThis & { __supplierosFirebase?: GlobalFirebase };

export async function createFirebaseDocumentStore(): Promise<DocumentStore> {
  if (globalForFb.__supplierosFirebase?.store) return globalForFb.__supplierosFirebase.store;

  const { getFirestore } = await import("firebase-admin/firestore");
  const app = await getFirebaseAdminApp();
  const db = getFirestore(app, getFirestoreDatabaseId());
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings() can only run once per Firestore instance
  }

  const store: DocumentStore = {
    async get(collection: string, id: string) {
      const snap = await db.collection(collection).doc(id).get();
      if (!snap.exists) return null;
      return { id: snap.id, ...snap.data() } as DbDoc;
    },
    async set(collection: string, id: string, data: Record<string, unknown>) {
      await db.collection(collection).doc(id).set({ ...data, id }, { merge: true });
    },
    async update(collection: string, id: string, data: Record<string, unknown>) {
      await db.collection(collection).doc(id).set({ ...data, id }, { merge: true });
    },
    async delete(collection: string, id: string) {
      await db.collection(collection).doc(id).delete();
    },
    async query(collection: string, options: QueryOptions = {}) {
      const where = options.where ?? [];
      const firstEq = where.find((clause) => clause.op === "==");
      const remainder = firstEq ? where.filter((clause) => clause !== firstEq) : where;
      const ref = db.collection(collection);
      const snap = firstEq
        ? await ref.where(firstEq.field, "==", firstEq.value as string | number | boolean | null).get()
        : await ref.get();
      let rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as DbDoc);
      if (remainder.length) rows = rows.filter((doc) => matchesWhere(doc, remainder));
      if (options.orderBy?.length) rows = sortDocs(rows, options.orderBy);
      if (options.limit != null) rows = rows.slice(0, options.limit);
      return rows;
    },
    async increment(collection, id, field, extra = {}) {
      const ref = db.collection(collection).doc(id);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const current = Number(snap.data()?.[field] ?? 1);
        tx.set(
          ref,
          { id, [field]: current + 1, updatedAt: nowIso(), ...extra },
          { merge: true },
        );
        return current;
      });
    },
  };

  if (!globalForFb.__supplierosFirebase) globalForFb.__supplierosFirebase = {};
  globalForFb.__supplierosFirebase.store = store;
  return store;
}
