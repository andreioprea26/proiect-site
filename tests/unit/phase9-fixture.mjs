// Isolated PostgreSQL fixture only. No Supabase client, credentials, or remote I/O.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

const { PGlite } = await import(process.env.HANDMADE_PGLITE_MODULE || "@electric-sql/pglite");
const migrations = new URL("../../supabase/migrations/", import.meta.url);
const original = readdirSync(migrations).filter((file) =>
  /^\d{14}_.+\.sql$/.test(file) && file.slice(0, 14) < "20260915120000").sort();
const extension = execFileSync("git", [
  "show", "0081812ce76f16811cd97b983cd772f139cc10f1:supabase/migrations/20260915120000_public_store_settings.sql",
], { encoding: "utf8", cwd: new URL("../../", import.meta.url) });

export async function createPhase9Fixture(extended = false) {
  const db = new PGlite();
  try {
    // Supabase platform substitutes, not a real Auth/Storage service. Default
    // grants reproduce the permissive baseline subsequently restricted by SQL.
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create role inherited_sequence_reader;
      create schema auth; create schema storage; create schema supabase_migrations;
      create table auth.users(
        id uuid primary key, instance_id uuid, aud text, role text, email text,
        encrypted_password text, email_confirmed_at timestamptz,
        raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz
      );
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create function auth.role() returns text language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
      alter table storage.objects enable row level security;
      grant usage on schema public, auth, storage to anon, authenticated, service_role;
      grant all on all tables in schema storage to anon, authenticated, service_role;
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
      alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
      create table supabase_migrations.schema_migrations(version text primary key, statements text[], name text);
    `);
    for (const file of original) {
      await db.exec(readFileSync(new URL(file, migrations), "utf8"));
      await db.query("insert into supabase_migrations.schema_migrations values($1,$2,$3)",
        [file.slice(0, 14), ["original migration fixture"], file.slice(15, -4)]);
    }
    if (extended) {
      await db.exec(extension);
      await db.query("insert into supabase_migrations.schema_migrations values($1,$2,$3)",
        ["20260915120000", [extension], "public_store_settings"]);
    }
    return db;
  } catch (error) { await db.close(); throw error; }
}
