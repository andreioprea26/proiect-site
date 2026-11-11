import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { createPhase9Fixture } from "./phase9-fixture.mjs";
import { snapshotQuery } from "../../scripts/order-sequence-guards.mjs";
import { prepareDevelopmentSql } from "../../scripts/prepare-order-sequence-hardening.mjs";

const directory = new URL("../../supabase/tests/", import.meta.url);
const suites = readdirSync(directory).filter((file) => file.endsWith(".sql")).sort();

// Execute unchanged SQL suites only in fresh in-memory PostgreSQL instances.
// Auth and Storage are local platform substitutes, not real service integrations.
for (const file of suites) {
  test(`Phase 9 + preserved Store Settings + 9.2: ${file}`, async () => {
    const db = await createPhase9Fixture(true);
    try {
      const before = (await db.query(snapshotQuery)).rows[0].audit;
      await db.exec(prepareDevelopmentSql(before));
      assert.equal((await db.query("select count(*)::int as n from supabase_migrations.schema_migrations")).rows[0].n, 29);
      await db.exec(readFileSync(new URL(file, directory), "utf8"));
    } finally { await db.close(); }
  });
}
