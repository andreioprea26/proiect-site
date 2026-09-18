// Operator-only fixture transport. Never imported by application code.
// Auth/RPC/security assertions still use real API clients and runtime privileges.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertApprovedTestTarget, DEMO_PROJECT_REF } from "./demo-target";

const execute = promisify(execFile);
const tables = new Set([
  "products", "inventory", "inventory_movements", "shipping_methods", "orders",
  "order_items", "order_status_history", "payments", "payment_refunds", "shipments",
  "stock_reservations", "notification_logs", "notification_attempts", "cod_collections",
  "cod_collection_events", "reviews", "review_moderation_events", "favorites",
  "homepage_blocks", "contact_requests", "custom_order_requests", "newsletter_subscribers",
  "content_pages",
]);
const identifier = (name: string): string => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error("Unsupported fixture SQL identifier");
  return `"${name}"`;
};
const literal = (value: unknown): string => {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Nonfinite fixture value");
    return String(value);
  }
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return "'" + text.replaceAll("'", "''") + "'";
};
const column = (name: string): string => {
  const parts = name.split("->>");
  return parts.length === 2 ? `${identifier(parts[0])}->>${literal(parts[1])}` : identifier(name);
};

type Result = { data: unknown; error: null | { message: string }; count: number | null };
export class FixtureQuery implements PromiseLike<Result> {
  private action = "select";
  private projection = "*";
  private rows: Record<string, unknown>[] = [];
  private predicates: string[] = [];
  private cardinality = "many";
  private head = false;
  private counted = false;
  constructor(private table: string) {
    if (!tables.has(table)) throw new Error("Table outside fixture allowlist");
  }
  select(fields = "*", options?: { head?: boolean; count?: string }) {
    this.projection = fields === "*" ? "*" : fields.split(",").map(s => identifier(s.trim())).join(",");
    this.head = !!options?.head; this.counted = !!options?.count; return this;
  }
  insert(value: Record<string, unknown> | Record<string, unknown>[]) { this.action = "insert"; this.rows = Array.isArray(value) ? value : [value]; return this; }
  upsert(value: Record<string, unknown> | Record<string, unknown>[]) { this.insert(value); this.action = "upsert"; return this; }
  update(value: Record<string, unknown>) { this.action = "update"; this.rows = [value]; return this; }
  delete() { this.action = "delete"; return this; }
  eq(name: string, value: unknown) { this.predicates.push(`${column(name)} = ${literal(value)}`); return this; }
  in(name: string, values: unknown[]) { this.predicates.push(values.length ? `${column(name)} in (${values.map(literal).join(",")})` : "false"); return this; }
  like(name: string, value: string) { this.predicates.push(`${column(name)} like ${literal(value)}`); return this; }
  is(name: string, value: null) { if (value !== null) throw new Error("Unsupported is filter"); this.predicates.push(`${column(name)} is null`); return this; }
  contains(name: string, value: unknown) { this.predicates.push(`${column(name)} @> ${literal(value)}::jsonb`); return this; }
  single() { this.cardinality = "one"; return this; }
  maybeSingle() { this.cardinality = "optional"; return this; }
  then<T1 = Result, T2 = never>(resolve?: ((value: Result) => T1 | PromiseLike<T1>) | null, reject?: ((reason: unknown) => T2 | PromiseLike<T2>) | null): PromiseLike<T1 | T2> {
    return this.run().then(resolve, reject);
  }
  compileSql(): string {
    const table = `public.${identifier(this.table)}`;
    if (["update", "delete"].includes(this.action) && !this.predicates.length) throw new Error("Unfiltered fixture mutation refused");
    // Preserve manually validated seed/order records even if a future test uses a broad filter.
    const protectedIds = this.table === "orders" ? ["5c320cc4-8931-423c-ba2f-91619c22b945"] :
      this.table === "products" ? ["2d100000-0000-4000-8000-000000000001", "2d100000-0000-4000-8000-000000000002"] :
      this.table === "shipping_methods" ? ["2d100000-0000-4000-8000-000000000006"] : [];
    const predicates = [...this.predicates];
    if (this.action !== "select" && protectedIds.length) predicates.push(`id not in (${protectedIds.map(literal).join(",")})`);
    const where = predicates.length ? ` where ${predicates.join(" and ")}` : "";
    let query: string;
    let payloads = "";
    if (this.action === "select") query = `select ${this.projection} from ${table}${where}`;
    else if (this.action === "delete") query = `delete from ${table}${where} returning ${this.projection}`;
    else {
      if (!this.rows.length) throw new Error("Empty fixture rows");
      const keys = [...new Set(this.rows.flatMap(row => Object.keys(row)))];
      if (!keys.length) throw new Error("Empty fixture payload");
      const cols = keys.map(identifier).join(",");
      payloads = this.rows.map((row, i) => `payload_${i} as (select jsonb_populate_record(null::${table},${literal(row)}::jsonb) as r),`).join("");
      const records = this.rows.map((row, i) => `(${keys.map(key => Object.hasOwn(row, key) ? `(select (r).${identifier(key)} from payload_${i})` : "DEFAULT").join(",")})`).join(",");
      if (this.action === "update") {
        query = `update ${table} set (${cols}) = ${records}${where} returning ${this.projection}`;
      } else {
        for (const row of this.rows) if (protectedIds.includes(String(row.id))) throw new Error("Protected demo record collision");
        const conflict = this.action === "upsert" ? ` on conflict (id) do update set ${keys.filter(k => k !== "id").map(k => `${identifier(k)}=excluded.${identifier(k)}`).join(",")}` : "";
        query = `insert into ${table} (${cols}) values ${records}${conflict} returning ${this.projection}`;
      }
    }
    return `begin; set local statement_timeout='20s'; select set_config('request.jwt.claim.role','service_role',true); with ${payloads} fixture_rows as (${query}) select coalesce(jsonb_agg(to_jsonb(fixture_rows)),'[]'::jsonb) as fixture_rows from fixture_rows; commit;`;
  }
  private async run(): Promise<Result> {
    assertApprovedTestTarget(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    if (process.env.E2E_APPROVED_PROJECT_REF !== DEMO_PROJECT_REF) throw new Error("Operator fixture transport requires explicit demo mode");
    const sql = this.compileSql();
    const directory = await mkdtemp(join(tmpdir(), "demo-e2e-sql-"));
    const file = join(directory, "fixture.sql");
    const started = Date.now();
    try {
      // SQL payloads must not depend on Windows command-line length limits.
      // No retries: a lost response must never replay a potentially committed write.
      await writeFile(file, sql, { flag: "wx", mode: 0o600 });
      const { stdout } = await execute("supabase", ["db", "query", "--linked", "--project-ref", DEMO_PROJECT_REF, "--file", file], { maxBuffer: 4 * 1024 * 1024, timeout: 90000 });
      const parsed = JSON.parse(stdout.slice(stdout.indexOf("{")));
      const rows = parsed.rows?.[0]?.fixture_rows;
      if (!Array.isArray(rows)) throw new Error("Unexpected fixture SQL response");
      if (this.cardinality === "one" && rows.length !== 1 || this.cardinality === "optional" && rows.length > 1) return { data: null, error: { message: "Fixture cardinality mismatch" }, count: rows.length };
      return { data: this.head ? null : this.cardinality === "many" ? rows : rows[0] ?? null, error: null, count: this.counted ? rows.length : null };
    } catch (failure) {
      // Never emit CLI payloads, credentials, or whole fixture rows to reporters.
      const output = failure && typeof failure === "object" && "stderr" in failure ? String(failure.stderr) : "";
      const code = output.match(/ERROR:\s+(\d{5}|[0-9A-Z]{5}):/)?.[1] ?? "unknown";
      const processCode = failure && typeof failure === "object" && "code" in failure ? String(failure.code).replace(/[^A-Za-z0-9_-]/g, "") : "none";
      const constraint = output.match(/constraint\s+\\?"([a-z_0-9]+)\\?"/)?.[1];
      const killed = !!(failure && typeof failure === "object" && "killed" in failure && failure.killed);
      return { data: null, error: { message: `Demo operator fixture ${this.action} failed on ${this.table}; SQLSTATE=${code}; process=${processCode}; killed=${killed}; elapsedMs=${Date.now() - started}${constraint ? ` constraint=${constraint}` : ""}` }, count: null };
    } finally {
      await rm(file, { force: true });
      await rmdir(directory);
    }
  }
}

export function createFixtureClient(url: string, key: string, options?: Parameters<typeof createClient>[2]): SupabaseClient {
  assertApprovedTestTarget(url);
  const client = createClient(url, key, options);
  if (process.env.E2E_APPROVED_PROJECT_REF !== DEMO_PROJECT_REF) return client;
  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === "from") return (table: string) => new FixtureQuery(table);
      return Reflect.get(target, property, receiver);
    },
  });
}
