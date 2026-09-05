import "server-only";
import fs from "node:fs/promises";
import { getFirebaseProjectId, firebaseWebConfig } from "@/lib/firebase/config";

type GlobalAdmin = {
  app?: import("firebase-admin/app").App;
};

const globalForAdmin = globalThis as typeof globalThis & { __supplierosAdminApp?: GlobalAdmin };

export async function readFirebaseServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
  const raw = json ?? (filePath ? await fs.readFile(filePath, "utf8") : null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
  } catch {
    throw new Error("Firebase service account JSON is not valid.");
  }
}

export async function getFirebaseAdminApp() {
  if (globalForAdmin.__supplierosAdminApp?.app) return globalForAdmin.__supplierosAdminApp.app;

  const { cert, getApps, initializeApp } = await import("firebase-admin/app");
  const serviceAccount = await readFirebaseServiceAccount();
  const projectId = getFirebaseProjectId() || serviceAccount?.project_id;
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID or a Firebase service account is required.");
  }

  let app = getApps()[0];
  if (!app) {
    if (serviceAccount?.client_email && serviceAccount.private_key) {
      app = initializeApp({
        credential: cert({
          projectId: serviceAccount.project_id || projectId,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
        }),
        projectId,
        storageBucket: firebaseWebConfig.storageBucket,
      });
    } else if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      app = initializeApp({ projectId, storageBucket: firebaseWebConfig.storageBucket });
    } else {
      app = initializeApp({ projectId, storageBucket: firebaseWebConfig.storageBucket });
    }
  }

  if (!globalForAdmin.__supplierosAdminApp) globalForAdmin.__supplierosAdminApp = {};
  globalForAdmin.__supplierosAdminApp.app = app;
  return app;
}
