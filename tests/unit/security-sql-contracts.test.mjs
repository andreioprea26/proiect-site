import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Optional local test tool, installed outside the repository. No network or
// Supabase credentials are used by this test. See the task documentation.
const { PGlite } = await import(process.env.HANDMADE_PGLITE_MODULE || "@electric-sql/pglite");
const securitySql = readFileSync(new URL("../../supabase/tests/security_data_integrity.sql", import.meta.url), "utf8");
const sequenceSql = readFileSync(new URL("../../supabase/tests/order_public_number_sequence_privileges.sql", import.meta.url), "utf8");
const allowlist = securitySql.match(/select p\.oid::regprocedure::text into v_unexpected_anon_function[\s\S]*?limit 1;/)?.[0]
  .replace(" into v_unexpected_anon_function", "");
assert.ok(allowlist, "original anonymous SECURITY DEFINER check must exist");

test("strict anonymous RPC allowlist and sequence privileges (isolated PostgreSQL)", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create role unexpected_role;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as 'select null::uuid';
      create function public.is_admin() returns boolean language sql stable as 'select false';
    `);

    await t.test("original anonymous allowlist accepts no additional RPCs", async () => {
      assert.equal((await db.query(allowlist)).rows.length, 0);
    });
    await t.test("other anonymous SECURITY DEFINER functions remain rejected", async () => {
      await db.exec("begin; create function public.unexpected_rpc() returns boolean language sql security definer set search_path = '' as 'select true'; grant execute on function public.unexpected_rpc() to anon;");
      try {
        assert.equal((await db.query(allowlist)).rows[0].oid, "unexpected_rpc()");
      } finally { await db.exec("rollback;"); }
    });

    await db.exec(`
      create sequence public.order_public_number_seq;
      create function public.next_order_public_number() returns text language sql
        security definer set search_path = '' as
        $$ select nextval('public.order_public_number_seq')::text $$;
      revoke all on function public.next_order_public_number() from public, anon, authenticated;
      grant execute on function public.next_order_public_number() to service_role;
    `);
    await t.test("sequence metadata passes without browser grants and does not advance it", async () => {
      await db.exec(sequenceSql);
      assert.equal((await db.query("select is_called from public.order_public_number_seq")).rows[0].is_called, false);
    });
    for (const role of ["anon", "authenticated", "public"]) {
      for (const privilege of ["usage", "select", "update"]) {
        await t.test(`sequence rejects ${role} ${privilege}`, async () => {
          await db.exec(`grant ${privilege} on sequence public.order_public_number_seq to ${role};`);
          try { await assert.rejects(db.exec(sequenceSql), /sequence privileges/); }
          finally {
            await db.exec("rollback;");
            await db.exec(`revoke all on sequence public.order_public_number_seq from ${role};`);
          }
        });
      }
    }
  } finally { await db.close(); }
});
