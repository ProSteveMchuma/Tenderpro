import fs from "node:fs/promises";
import path from "node:path";
import { getDatabaseDriver, getSql } from "@/lib/db/client";
import { seedDemoData } from "@/lib/db/seed";
import { getDocumentStore, getFirestoreBackend } from "@/lib/db/firestore/client";
import { getFirebaseProjectId } from "@/lib/firebase/config";

let bootPromise: Promise<void> | null = null;

export async function bootstrapDatabase() {
  if (!bootPromise) bootPromise = runBootstrap();
  await bootPromise;
}

export function resetDatabaseBootstrap() {
  bootPromise = null;
}

async function runBootstrap() {
  const driver = getDatabaseDriver();
  if (driver === "firestore") {
    await getDocumentStore();
    const backend = await getFirestoreBackend();
    console.info(
      `[supplieros] database driver=firestore backend=${backend} project=${getFirebaseProjectId()}`,
    );
  } else {
    const sql = await getSql();
    const schemaPath = path.join(process.cwd(), "supabase/migrations/20260903_init.sql");
    const schemaSql = await fs.readFile(schemaPath, "utf8");
    await sql.exec(schemaSql);
    if (sql.dialect === "postgres") {
      try {
        const rlsPath = path.join(process.cwd(), "supabase/migrations/20260903_rls.sql");
        const rlsSql = await fs.readFile(rlsPath, "utf8");
        await sql.exec(rlsSql);
      } catch (error) {
        console.warn("RLS policies were not applied:", error);
      }
    }
    console.info(`[supplieros] database driver=${sql.dialect}`);
  }

  const demo = process.env.DEMO_MODE !== "false";
  const seedOnBoot = process.env.DEMO_SEED_ON_BOOT !== "false";
  if (demo && seedOnBoot) {
    await seedDemoData();
  }
}
