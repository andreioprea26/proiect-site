import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSnapshotGuards } from "./order-sequence-guards.mjs";

// Offline SQL preparation only. This module has no database client, credentials,
// network access, subprocess execution, or automatic application capability.
export const version = "20261110120000";
export const name = "harden_order_public_number_sequence";
const migrationsUrl = new URL("../supabase/migrations/", import.meta.url);
const literal = (value) => `'${value.replaceAll("'", "''")}'`;

export function prepareDevelopmentSql(snapshot) {
  const files = readdirSync(migrationsUrl).filter((file) => /^\d{14}_.+\.sql$/.test(file)).sort();
  const original = files.filter((file) => file.slice(0, 14) < "20260915120000");
  if (original.length !== 27 || files.length !== 28
    || !files.includes(`${version}_${name}.sql`)) {
    throw new Error("Unexpected local migration manifest; review the application procedure again");
  }
  const expected = original.map((file) => ({ version: file.slice(0, 14), name: file.slice(15, -4) }));
  expected.push({ version: "20260915120000", name: "public_store_settings" });
  const migration = readFileSync(new URL(`${version}_${name}.sql`, migrationsUrl), "utf8");
  const guards = snapshot ? buildSnapshotGuards(snapshot, migration) : { preflight: "", postflight: "" };
  const sequenceTest = snapshot
    ? readFileSync(new URL("../supabase/tests/order_public_number_sequence_privileges.sql", import.meta.url), "utf8")
      .match(/do \$\$[\s\S]*?\$\$;/)?.[0] : "";
  if (snapshot && !sequenceTest) throw new Error("Sequence metadata security test is missing");
  return `-- PREPARED ONLY: requires explicit owner authorization and the approved recovery plan.
-- DEVELOPMENT ONLY: bdyocajhhylvasfhmnal. Verify connection/project identity independently.
-- Execute the ENTIRE batch in one session with stop-on-error. Never select only REVOKE.
begin;
set local standard_conforming_strings = on;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table supabase_migrations.schema_migrations in share row exclusive mode;
${guards.preflight}
do $history_preflight$
declare v_history jsonb;
begin
  select jsonb_agg(jsonb_build_object('version', version, 'name', name) order by version)
    into v_history from supabase_migrations.schema_migrations;
  if v_history is distinct from ${literal(JSON.stringify(expected))}::jsonb then
    raise exception 'Development migration history differs from the audited 28 versions/names; STOP';
  end if;
end;
$history_preflight$;

${migration}

-- Record only the change actually applied above. Do not delete or repair 10B history.
insert into supabase_migrations.schema_migrations(version, name, statements)
values (${literal(version)}, ${literal(name)}, array[${literal(migration)}]::text[]);
${sequenceTest}
${guards.postflight}
commit;
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  let snapshot;
  if (process.argv.length > 2) {
    if (process.argv.length !== 4 || process.argv[2] !== "--snapshot") {
      throw new Error("Usage: node scripts/prepare-order-sequence-hardening.mjs [--snapshot technical-snapshot.json]");
    }
    const envelope = JSON.parse(readFileSync(process.argv[3], "utf8"));
    if (envelope.projectRef !== "bdyocajhhylvasfhmnal") throw new Error("Snapshot project ref mismatch");
    snapshot = envelope.snapshot;
  }
  process.stdout.write(prepareDevelopmentSql(snapshot));
}
