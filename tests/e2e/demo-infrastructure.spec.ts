import { expect, test } from "@playwright/test";
import { FixtureQuery } from "./demo-fixture-client";
import { assertApprovedTestTarget, DEMO_PROJECT_REF } from "./demo-target";

test("fixture SQL rejects unlisted tables, identifiers and unfiltered writes", () => {
  expect(() => new FixtureQuery("profiles")).toThrow();
  expect(() => new FixtureQuery("orders").select("id;drop table orders")).toThrow();
  expect(() => new FixtureQuery("orders").delete().compileSql()).toThrow();
  expect(() => new FixtureQuery("orders").update({ status: "paid" }).compileSql()).toThrow();
});
test("fixture values stay SQL literals and empty filters cannot delete rows", () => {
  const sql = new FixtureQuery("products").delete().eq("slug", "x'; delete from auth.users; --").compileSql();
  expect(sql).toContain("'x''; delete from auth.users; --'");
  expect(new FixtureQuery("products").delete().in("id", []).compileSql()).toContain("where false");
});
test("fixture mutations protect the manual demo order and seed", () => {
  const sql = new FixtureQuery("orders").delete().like("email", "%@example.com").compileSql();
  expect(sql).toContain("id not in ('5c320cc4-8931-423c-ba2f-91619c22b945')");
  expect(() => new FixtureQuery("products").insert({ id: "2d100000-0000-4000-8000-000000000001" }).compileSql()).toThrow();
  expect(sql).not.toMatch(/\b(grant|alter|truncate)\b/i);
});
test("explicit demo mode fails closed for original or arbitrary targets", () => {
  const previous = process.env.E2E_APPROVED_PROJECT_REF;
  try {
    process.env.E2E_APPROVED_PROJECT_REF = DEMO_PROJECT_REF;
    expect(() => assertApprovedTestTarget(`https://${DEMO_PROJECT_REF}.supabase.co`)).not.toThrow();
    expect(() => assertApprovedTestTarget("https://bdyocajhhylvasfhmnal.supabase.co")).toThrow();
    expect(() => assertApprovedTestTarget("https://example.com")).toThrow();
  } finally {
    if (previous === undefined) delete process.env.E2E_APPROVED_PROJECT_REF;
    else process.env.E2E_APPROVED_PROJECT_REF = previous;
  }
});
