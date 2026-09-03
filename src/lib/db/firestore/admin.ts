import "server-only";
import {
  DbDoc,
  DocumentStore,
  QueryOptions,
  matchesWhere,
  sortDocs,
} from "@/lib/db/types";

type GlobalFirebase = {
  app?: import("firebase-admin/app").App;
  store?: DocumentStore;
};

const globalForFb = globalThis as typeof globalThis & { __supplierosFirebase?: GlobalFirebase };

function readServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return null;
  try {
    return JSON.parse(json) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }
}

export async function createFirebaseDocumentStore(): Promise<DocumentStore> {
  if (globalForFb.__supplierosFirebase?.store) return globalForFb.__supplierosFirebase.store;

  const { cert, getApps, initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  const projectId = process.env.FIREBASE_PROJECT_ID || readServiceAccount()?.project_id;
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_JSON is required for cloud Firestore.");
  }

  let app = getApps()[0];
  if (!app) {
    const serviceAccount = readServiceAccount();
    if (serviceAccount?.client_email && serviceAccount.private_key) {
      app = initializeApp({
        credential: cert({
          projectId: serviceAccount.project_id || projectId,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
        }),
        projectId,
      });
    } else if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      app = initializeApp({ projectId });
    } else {
      // Application Default Credentials (GCP / Firebase Functions)
      app = initializeApp({ projectId });
    }
  }

  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

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
      // Push a single equality filter to Firestore so new projects work without composite indexes.
      // Remaining filters, sorts, and limits run in memory (fine at organization scale).
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
  };

  if (!globalForFb.__supplierosFirebase) globalForFb.__supplierosFirebase = {};
  globalForFb.__supplierosFirebase.app = app;
  globalForFb.__supplierosFirebase.store = store;
  return store;
}
