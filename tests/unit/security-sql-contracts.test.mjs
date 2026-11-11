import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

// Optional local test tool, installed outside the repository. No network or
// Supabase credentials are used by this test. See the task documentation.
const { PGlite } = await import(process.env.HANDMADE_PGLITE_MODULE || "@electric-sql/pglite");
const securitySql = readFileSync(new URL("../../supabase/tests/security_data_integrity.sql", import.meta.url), "utf8");
const sequenceSql = readFileSync(new URL("../../supabase/tests/order_public_number_sequence_privileges.sql", import.meta.url), "utf8");
const contract = securitySql.match(/do \$store_settings_contract\$[\s\S]*?\$store_settings_contract\$;/)?.[0];
assert.ok(contract, "optional SQL contract must exist");
const allowlist = securitySql.match(/select p\.oid::regprocedure::text into v_unexpected_anon_function[\s\S]*?limit 1;/)?.[0]
  .replace(" into v_unexpected_anon_function", "");
assert.ok(allowlist, "original anonymous SECURITY DEFINER check must exist");
const extensionSql = execFileSync("git", [
  "show", "0081812ce76f16811cd97b983cd772f139cc10f1:supabase/migrations/20260915120000_public_store_settings.sql",
], { encoding: "utf8", cwd: new URL("../../", import.meta.url) });
const saveSignature = "public.save_store_settings(text,text,text,text,text,text,text,text,text,text,text)";

test("optional store settings contract and sequence privileges (isolated PostgreSQL)", async (t) => {
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

    await t.test("27-migration shape: optional objects absent", async () => {
      await db.exec(contract);
      assert.equal((await db.query(allowlist)).rows.length, 0);
    });
    await t.test("wrong signature without the audited zero-argument function is rejected", async () => {
      await db.exec("begin; create function public.get_public_store_settings(text) returns text language sql as 'select $1';");
      try { await assert.rejects(db.exec(contract), /signature or overload/); }
      finally { await db.exec("rollback;"); }
    });

    // Apply the immutable historical migration only to the in-memory fixture.
    await db.exec(extensionSql);
    await t.test("28-migration shape: exact audited extension is accepted", async () => {
      await db.exec(contract);
      assert.equal((await db.query(allowlist)).rows.length, 0);
    });

    const mutations = [
      ["overload", "create function public.get_public_store_settings(text) returns text language sql as 'select $1';", /signature or overload/],
      ["owner", "alter function public.get_public_store_settings() owner to unexpected_role;", /definition\/public projection/],
      ["volatility", "alter function public.get_public_store_settings() volatile;", /definition\/public projection/],
      ["search_path", "alter function public.get_public_store_settings() set search_path = public;", /definition\/public projection/],
      ["PUBLIC execute", "grant execute on function public.get_public_store_settings() to public;", /effective EXECUTE|ACL/],
      ["extra grantee", "grant execute on function public.get_public_store_settings() to unexpected_role;", /ACL/],
      ["grant option", "grant execute on function public.get_public_store_settings() to anon with grant option;", /ACL/],
      ["missing anon execute", "revoke execute on function public.get_public_store_settings() from anon;", /effective EXECUTE/],
      ["missing authenticated execute", "revoke execute on function public.get_public_store_settings() from authenticated;", /effective EXECUTE/],
      ["service execute", "grant execute on function public.get_public_store_settings() to service_role;", /effective EXECUTE/],
      ["disabled RLS", "alter table public.store_settings disable row level security;", /RLS-protected/],
      ["anonymous table read", "grant select on public.store_settings to anon;", /anon has direct/],
      ["anonymous internal column read", "grant select(updated_by) on public.store_settings to anon;", /anon has direct/],
      ["customer column write", "grant update(display_name) on public.store_settings to authenticated;", /authenticated store_settings/],
      ["permissive admin policy", "alter policy store_settings_admin_read on public.store_settings using (true);", /admin-only RLS/],
      ["additional policy", "create policy bypass on public.store_settings for select to anon using (true);", /admin-only RLS/],
      ["anonymous save", `grant execute on function ${saveSignature} to anon;`, /administrative RPC grants/],
    ];
    const originalDefinition = (await db.query("select pg_get_functiondef('public.get_public_store_settings()'::regprocedure) as definition")).rows[0].definition;
    mutations.push(
      ["private data under a public alias", originalDefinition.replace("select s.display_name,", "select s.updated_by::text,"), /definition\/public projection/],
      ["modified return projection", `drop function public.get_public_store_settings(); ${originalDefinition.replace("TABLE(display_name text", "TABLE(unexpected_field text")}`, /definition\/public projection/],
    );
    for (const [name, mutation, message] of mutations) {
      await t.test(`rejects ${name}`, async () => {
        await db.exec("begin;");
        try {
          await db.exec(mutation);
          await assert.rejects(db.exec(contract), message);
        } finally { await db.exec("rollback;"); }
      });
    }
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
