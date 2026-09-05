import "server-only";
import { DocumentStore, resolveDriver } from "@/lib/db/types";
import { createLocalDocumentStore } from "@/lib/db/firestore/local-store";
import { createFirebaseDocumentStore } from "@/lib/db/firestore/admin";
import { isProduction } from "@/lib/config/runtime";
import { getFirebaseProjectId } from "@/lib/firebase/config";

type GlobalStore = {
  store?: DocumentStore;
  ready?: Promise<DocumentStore>;
  mode?: "local" | "cloud";
};

const globalForStore = globalThis as typeof globalThis & { __supplierosDocStore?: GlobalStore };

export function firestoreMode(): "local" | "cloud" {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return "cloud";
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) return "cloud";
  if (process.env.FIRESTORE_EMULATOR_HOST) return "cloud";
  if (getFirebaseProjectId() && process.env.GOOGLE_APPLICATION_CREDENTIALS) return "cloud";
  if (process.env.FIREBASE_USE_CLOUD === "true" && getFirebaseProjectId()) return "cloud";
  return "local";
}

export async function getDocumentStore(): Promise<DocumentStore> {
  if (resolveDriver() !== "firestore") {
    throw new Error("Document store is only available when DATABASE_DRIVER=firestore.");
  }
  if (isProduction() && firestoreMode() === "local") {
    throw new Error("Cloud Firestore credentials are required in production.");
  }
  if (globalForStore.__supplierosDocStore?.store) return globalForStore.__supplierosDocStore.store;
  if (!globalForStore.__supplierosDocStore) globalForStore.__supplierosDocStore = {};
  if (!globalForStore.__supplierosDocStore.ready) {
    globalForStore.__supplierosDocStore.ready = (async () => {
      const mode = firestoreMode();
      globalForStore.__supplierosDocStore!.mode = mode;
      if (mode === "cloud") {
        try {
          return await createFirebaseDocumentStore();
        } catch (error) {
          const hasCredentials = Boolean(
            process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
          );
          if (hasCredentials || isProduction()) throw error;
          console.warn("Cloud Firestore unavailable, using local Firestore document store:", error);
          return createLocalDocumentStore();
        }
      }
      return createLocalDocumentStore();
    })();
  }
  const store = await globalForStore.__supplierosDocStore.ready;
  globalForStore.__supplierosDocStore.store = store;
  return store;
}

export async function getFirestoreBackend() {
  await getDocumentStore();
  return globalForStore.__supplierosDocStore?.mode ?? "local";
}

export function resetDocumentStoreCache() {
  globalForStore.__supplierosDocStore = undefined;
}
