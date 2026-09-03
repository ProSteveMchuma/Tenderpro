import path from "node:path";
import os from "node:os";
import { describe, expect, it, beforeAll } from "vitest";
import { bootstrapDatabase, resetDatabaseBootstrap } from "@/lib/db/bootstrap";
import { resetDocumentStoreCache } from "@/lib/db/firestore/client";
import { resetLocalDocumentStore } from "@/lib/db/firestore/local-store";
import { listByOrg, docs } from "@/lib/db/repo";
import { DEMO } from "@/lib/db/demo";

describe("tenant isolation", () => {
  beforeAll(async () => {
    process.env.DATABASE_DRIVER = "firestore";
    process.env.DEMO_MODE = "true";
    process.env.DEMO_SEED_ON_BOOT = "true";
    process.env.FIREBASE_USE_CLOUD = "false";
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIRESTORE_EMULATOR_HOST;
    process.env.FIRESTORE_LOCAL_PATH = path.join(
      os.tmpdir(),
      `supplieros-firestore-test-${process.pid}.json`,
    );
    await resetLocalDocumentStore();
    resetDocumentStoreCache();
    resetDatabaseBootstrap();
    await bootstrapDatabase();
  });

  it("keeps Acme records out of the Rift Valley organization", async () => {
    const leaked = await listByOrg("invoices", DEMO.rift, {
      where: [{ field: "number", op: "==", value: "INV-2026-0084" }],
    });
    expect(leaked).toHaveLength(0);

    const acme = await listByOrg("invoices", DEMO.acme, {
      where: [{ field: "number", op: "==", value: "INV-2026-0084" }],
    });
    expect(acme).toHaveLength(1);

    const riftMembers = await docs("organization_members", {
      where: [
        { field: "organizationId", op: "==", value: DEMO.rift },
        { field: "userId", op: "==", value: DEMO.steve },
        { field: "status", op: "==", value: "active" },
      ],
    });
    expect(riftMembers.filter((row) => !row.deletedAt)).toHaveLength(0);
  });
});
