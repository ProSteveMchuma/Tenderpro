import { describe, expect, it } from "vitest";
import { bootstrapDatabase } from "@/lib/db/bootstrap";
import { query } from "@/lib/db/client";
import { DEMO } from "@/lib/db/seed";

describe("tenant isolation", () => {
  it("keeps Acme records out of the Rift Valley organization", async () => {
    await bootstrapDatabase();
    const leaked = await query(
      `select id from invoices where organization_id = $1 and number = 'INV-2026-0084'`,
      [DEMO.rift],
    );
    expect(leaked).toHaveLength(0);
    const acme = await query(
      `select id from invoices where organization_id = $1 and number = 'INV-2026-0084'`,
      [DEMO.acme],
    );
    expect(acme).toHaveLength(1);
    const riftMembers = await query(
      `select user_id from organization_members where organization_id = $1 and user_id = $2 and status = 'active'`,
      [DEMO.rift, DEMO.steve],
    );
    expect(riftMembers).toHaveLength(0);
  });
});
