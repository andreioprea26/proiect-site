import { expect, test } from "@playwright/test";

import {
  APP_ROLES,
  isAppRole,
  normalizeAppRoles,
  roleListHas,
} from "../../src/lib/auth/roles";

test("rolurile aplicației sunt limitate la customer și admin", () => {
  expect(APP_ROLES).toEqual(["customer", "admin"]);
  expect(isAppRole("customer")).toBe(true);
  expect(isAppRole("admin")).toBe(true);
  expect(isAppRole("owner")).toBe(false);
  expect(isAppRole(null)).toBe(false);
});

test("lipsa unui utilizator sau a unor roluri produce lista goală", () => {
  const roles = normalizeAppRoles(null);

  expect(roles).toEqual([]);
  expect(roleListHas(roles, "customer")).toBe(false);
  expect(roleListHas(roles, "admin")).toBe(false);
});

test("rolul customer este detectat fără a acorda admin", () => {
  const roles = normalizeAppRoles([{ role: "customer" }]);

  expect(roles).toEqual(["customer"]);
  expect(roleListHas(roles, "customer")).toBe(true);
  expect(roleListHas(roles, "admin")).toBe(false);
});

test("rolul admin este detectat numai când este prezent", () => {
  const roles = normalizeAppRoles([
    { role: "admin" },
    { role: "customer" },
  ]);

  expect(roles).toEqual(["customer", "admin"]);
  expect(roleListHas(roles, "admin")).toBe(true);
});

test("valorile arbitrare și duplicatele nu devin roluri valide", () => {
  const roles = normalizeAppRoles([
    { role: "customer" },
    { role: "owner" },
    { role: "customer" },
    { role: 1 },
  ]);

  expect(roles).toEqual(["customer"]);
  expect(roleListHas(roles, "owner")).toBe(false);
});
