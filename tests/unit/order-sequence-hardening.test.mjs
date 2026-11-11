import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { name, prepareDevelopmentSql, version } from "../../scripts/prepare-order-sequence-hardening.mjs";
import { snapshotQuery } from "../../scripts/order-sequence-guards.mjs";
import { createPhase9Fixture as fixture } from "./phase9-fixture.mjs";

const migrations = new URL("../../supabase/migrations/", import.meta.url);
const hardening = readFileSync(new URL(`${version}_${name}.sql`, migrations), "utf8");
const sqlTest = (file) => readFileSync(new URL(`../../supabase/tests/${file}.sql`, import.meta.url), "utf8");

async function snapshot(db) {
  return (await db.query(`select jsonb_build_object(
    'functions', (select jsonb_agg(jsonb_build_object('oid',oid,'definition',pg_get_functiondef(oid),'acl',proacl) order by oid)
      from pg_proc where pronamespace='public'::regnamespace),
    'other_relations', (select jsonb_agg(jsonb_build_object('oid',oid,'owner',relowner,'acl',relacl,'rls',relrowsecurity) order by oid)
      from pg_class where relnamespace='public'::regnamespace and oid<>'public.order_public_number_seq'::regclass),
    'policies', (select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p),
    'sequence_state', (select jsonb_build_object('last_value',last_value,'log_cnt',log_cnt,'is_called',is_called) from public.order_public_number_seq),
    'service_sequence', has_sequence_privilege('service_role','public.order_public_number_seq','USAGE,SELECT,UPDATE'),
    'sequence_acl_others', (select jsonb_agg(to_jsonb(a) order by a.grantee,a.privilege_type) from pg_class c,
      lateral aclexplode(c.relacl) a where c.oid='public.order_public_number_seq'::regclass
      and a.grantee not in (0,'anon'::regrole,'authenticated'::regrole))
  ) as snapshot`)).rows[0].snapshot;
}

for (const extended of [false, true]) {
  test(`real Phase 9 SQL + ${extended ? "Store Settings" : "no extension"}: hardening and order regression`, async (t) => {
    const db = await fixture(extended);
    try {
      await t.test("existing security suite passes before hardening", async () => {
        await db.exec(sqlTest("security_data_integrity"));
      });
      const before = await snapshot(db);
      const historyBefore = (await db.query("select * from supabase_migrations.schema_migrations order by version")).rows;
      await t.test("applies atomically using the appropriate history", async () => {
        await db.exec(extended ? prepareDevelopmentSql() : hardening);
        assert.deepEqual(await snapshot(db), before, "only target sequence grants may change");
        const historyAfter = (await db.query("select * from supabase_migrations.schema_migrations order by version")).rows;
        if (extended) {
          assert.deepEqual(historyAfter.slice(0, -1), historyBefore);
          assert.deepEqual(historyAfter.at(-1), { version, name, statements: [hardening] });
          assert.equal(historyAfter.length, 29);
        } else assert.deepEqual(historyAfter, historyBefore);
      });
      await t.test("existing security suites pass after hardening", async () => {
        await db.exec(sqlTest("security_data_integrity"));
        await db.exec(sqlTest("order_public_number_sequence_privileges"));
      });
      for (const role of ["anon", "authenticated"]) {
        for (const expression of ["nextval('public.order_public_number_seq')", "currval('public.order_public_number_seq')", "setval('public.order_public_number_seq', 999)"]) {
          await t.test(`${role} cannot call ${expression.split("(")[0]}`, async () => {
            await db.exec(`set role ${role};`);
            try { await assert.rejects(db.query(`select ${expression}`), (error) => error.code === "42501"); }
            finally { await db.exec("reset role;"); }
          });
        }
        await t.test(`${role} cannot read sequence state or call generator directly`, async () => {
          await db.exec(`set role ${role};`);
          try {
            await assert.rejects(db.query("select * from public.order_public_number_seq"), (error) => error.code === "42501");
            await assert.rejects(db.query("select public.next_order_public_number()"), (error) => error.code === "42501");
          } finally { await db.exec("reset role;"); }
        });
      }
      await t.test("service_role generates unchanged-format distinct order numbers", async () => {
        // Prove the definer path does not need service_role's direct sequence
        // grant either; this extra revoke exists ONLY in the local fixture.
        await db.exec("revoke all on sequence public.order_public_number_seq from service_role;");
        await db.exec("set role service_role;");
        try {
          const rows = (await db.query("select public.next_order_public_number() as number from generate_series(1,2)")).rows;
          assert.match(rows[0].number, /^CMD-\d{4}-\d{8}$/);
          assert.notEqual(rows[0].number, rows[1].number);
        } finally {
          await db.exec("reset role; grant all on sequence public.order_public_number_seq to service_role;");
        }
      });
      for (const role of ["anon", "authenticated", "service_role"]) {
        await t.test(`actual order RPC under ${role} still assigns a number through DEFAULT`, async () => {
          await db.exec("begin;");
          try {
            const product = (await db.query("insert into public.products(name,slug,base_price,product_type,publication_status,availability_status,is_customizable) values('Sequence role test','sequence-role-test',20,'made_to_order','published','in_stock',false) returning id")).rows[0].id;
            const shipping = (await db.query("insert into public.shipping_methods(code,name,price_minor) values('sequence-role-test','Sequence shipping',750) returning id")).rows[0].id;
            const checkout = {
              email: "sequence-test@example.com", phone: "0712345678", customerType: "individual",
              companyName: "", companyTaxId: "", companyRegistrationNumber: "",
              shippingAddress: { recipientName: "Sequence Test", phone: "0712345678", addressLine1: "Strada Test 1", addressLine2: "", city: "București", county: "București", postalCode: "010101", countryCode: "RO" },
              billingSameAsShipping: true, billingAddress: {}, shippingMethodId: shipping,
              paymentMethod: role === "service_role" ? "card" : "cash_on_delivery",
            };
            await db.exec(`set local role ${role};`);
            const rpc = role === "service_role" ? "prepare_card_order_server(gen_random_uuid(),$1::jsonb,$2::jsonb,null)" : "place_cod_order(gen_random_uuid(),$1::jsonb,$2::jsonb)";
            const result = (await db.query(`select public.${rpc} as result`, [JSON.stringify([{ key: "sequence-line", productId: product, variantId: null, quantity: 1, customizations: [] }]), JSON.stringify(checkout)])).rows[0].result;
            assert.equal(result.success, true, JSON.stringify(result));
            assert.match(result.publicNumber, /^CMD-\d{4}-\d{8}$/);
          } finally { await db.exec("reset role; rollback;"); }
        });
      }
      for (const file of ["place_cod_order", "stripe_checkout_webhook"]) {
        await t.test(`unchanged ${file}.sql exercises real stored order/payment logic locally`, async () => {
          await db.exec(sqlTest(file));
        });
      }
      await t.test("migration itself is idempotent", async () => {
        const state = await snapshot(db);
        await db.exec(hardening);
        assert.deepEqual(await snapshot(db), state);
      });
      if (extended) {
        await t.test("prepared batch refuses replay without changing history or grants", async () => {
          const state = await snapshot(db);
          await assert.rejects(db.exec(prepareDevelopmentSql()), /history differs/);
          await db.exec("rollback;");
          assert.deepEqual(await snapshot(db), state);
          assert.equal((await db.query("select count(*)::int as n from supabase_migrations.schema_migrations")).rows[0].n, 29);
        });
      }
    } finally { await db.close(); }
  });
}

test("inherited sequence grant aborts and restores the original ACL", async () => {
  const db = await fixture(true);
  try {
    await db.exec("grant usage on sequence public.order_public_number_seq to inherited_sequence_reader; grant inherited_sequence_reader to anon;");
    const acl = (await db.query("select relacl::text from pg_class where oid='public.order_public_number_seq'::regclass")).rows;
    await assert.rejects(db.exec(prepareDevelopmentSql()), /privileges remain effective/);
    await db.exec("rollback;");
    assert.deepEqual((await db.query("select relacl::text from pg_class where oid='public.order_public_number_seq'::regclass")).rows, acl);
    assert.equal((await db.query("select count(*)::int as n from supabase_migrations.schema_migrations")).rows[0].n, 28);
  } finally { await db.close(); }
});

test("failure to record history rolls back the grant change too", async () => {
  const db = await fixture(true);
  try {
    await db.exec(`alter table supabase_migrations.schema_migrations add check(version <> '${version}');`);
    const before = await snapshot(db);
    await assert.rejects(db.exec(prepareDevelopmentSql()), /check constraint/);
    await db.exec("rollback;");
    assert.deepEqual(await snapshot(db), before);
    assert.equal((await db.query("select has_sequence_privilege('anon','public.order_public_number_seq','USAGE') as allowed")).rows[0].allowed, true);
  } finally { await db.close(); }
});

test("same count with an unexpected historical migration name is refused before revocation", async () => {
  const db = await fixture(true);
  try {
    await db.exec("update supabase_migrations.schema_migrations set name='unexpected_drift' where version='20260915120000';");
    const before = await snapshot(db);
    await assert.rejects(db.exec(prepareDevelopmentSql()), /history differs/);
    await db.exec("rollback;");
    assert.deepEqual(await snapshot(db), before);
    assert.equal((await db.query("select has_sequence_privilege('authenticated','public.order_public_number_seq','UPDATE') as allowed")).rows[0].allowed, true);
  } finally { await db.close(); }
});

test("PUBLIC sequence grants are removed while privileged grants remain intact", async () => {
  const db = await fixture(false);
  try {
    await db.exec("grant all on sequence public.order_public_number_seq to public;");
    const before = await snapshot(db);
    await db.exec(hardening);
    assert.deepEqual(await snapshot(db), before);
    await db.exec(sqlTest("order_public_number_sequence_privileges"));
  } finally { await db.close(); }
});

test("complete persistent snapshot-guarded batch reaches COMMIT without replacing any guard", async () => {
  const db = await fixture(true);
  try {
    const before = (await db.query(snapshotQuery)).rows[0].audit;
    const batch = prepareDevelopmentSql(before);
    assert.ok(batch.includes("((v->'sequence') - array['acl','acl_entries']::text[])"));
    assert.ok(batch.trimEnd().endsWith("commit;"));
    await db.exec(batch);
    await db.exec(sqlTest("order_public_number_sequence_privileges"));
    const after = (await db.query(snapshotQuery)).rows[0].audit;
    assert.equal(after.migrations.length, 29);
    assert.deepEqual(after.migrations.slice(0, 28), before.migrations);
    assert.deepEqual(after.sequence_state, before.sequence_state);
    assert.deepEqual(after.functions, before.functions);
    assert.deepEqual(after.sequence.definition, before.sequence.definition);
  } finally { await db.close(); }
});

test("complete guarded batch refuses snapshot drift before revocation", async () => {
  const db = await fixture(true);
  try {
    const before = (await db.query(snapshotQuery)).rows[0].audit;
    const batch = prepareDevelopmentSql(before);
    await db.exec("grant select on sequence public.order_public_number_seq to inherited_sequence_reader;");
    await assert.rejects(db.exec(batch), /changed since saved snapshot/);
    await db.exec("rollback;");
    assert.equal((await db.query(snapshotQuery)).rows[0].audit.migrations.length, 28);
    assert.equal((await db.query("select has_sequence_privilege('anon','public.order_public_number_seq','USAGE') as allowed")).rows[0].allowed, true);
  } finally { await db.close(); }
});

test("postflight guard failure rolls back grants AND migration registration", async () => {
  const db = await fixture(true);
  try {
    const before = (await db.query(snapshotQuery)).rows[0].audit;
    const batch = prepareDevelopmentSql(before).replace("do $final_postflight$",
      "grant select on sequence public.order_public_number_seq to anon;\ndo $final_postflight$");
    await assert.rejects(db.exec(batch), /Unexpected sequence ACL/);
    await db.exec("rollback;");
    assert.deepEqual((await db.query(snapshotQuery)).rows[0].audit, before);
  } finally { await db.close(); }
});
