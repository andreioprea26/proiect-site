import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { STORE_CONFIG } from "../../src/lib/config/store";
import { SETTING_KEYS, resolveStoreSettings, type SettingsValues } from "../../src/lib/store-settings/model";
import { renderOperationalEmail } from "../../src/lib/email/templates";

// Runs in a dependency project before the rest of Chromium: identity is global state.
test.describe.serial("10B.2b Store Settings", () => {
  let admin: SupabaseClient;
  let customer: SupabaseClient;
  let original: SettingsValues;
  const brand = `Settings Demo ${crypto.randomUUID().slice(0, 8)}`;
  const params = (values: Partial<SettingsValues>) => Object.fromEntries(SETTING_KEYS.map((key) => [`p_${key}`, values[key] ?? null]));
  const save = async (values: Partial<SettingsValues>) => {
    const result = await admin.rpc("save_store_settings", params(values));
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ success: true });
  };

  test.beforeAll(async () => {
    for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "E2E_ADMIN_EMAIL", "E2E_ADMIN_PASSWORD", "E2E_TEST_EMAIL", "E2E_TEST_PASSWORD"]) {
      if (!process.env[key]) throw new Error(`Missing E2E configuration: ${key}`);
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    if (new URL(url).hostname !== "bdyocajhhylvasfhmnal.supabase.co") throw new Error("Store Settings tests require the approved Development project");
    const options = { auth: { autoRefreshToken: false, persistSession: false } };
    admin = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options);
    customer = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options);
    const a = await admin.auth.signInWithPassword({ email: process.env.E2E_ADMIN_EMAIL!, password: process.env.E2E_ADMIN_PASSWORD! });
    const c = await customer.auth.signInWithPassword({ email: process.env.E2E_TEST_EMAIL!, password: process.env.E2E_TEST_PASSWORD! });
    expect(a.error).toBeNull(); expect(c.error).toBeNull();
    const row = await admin.from("store_settings").select(SETTING_KEYS.join(",")).eq("singleton", true).single();
    expect(row.error).toBeNull();
    original = row.data as unknown as SettingsValues;
    await save({});
  });
  test.afterAll(async () => {
    if (original) await save(original);
    await admin?.auth.signOut({ scope: "local" });
    await customer?.auth.signOut({ scope: "local" });
  });

  test("empty overrides use the versioned fallback", async ({ page }) => {
    await page.goto("/shop");
    await expect(page).toHaveTitle(`Magazin | ${STORE_CONFIG.name}`);
    await expect(page.locator("footer")).toContainText(STORE_CONFIG.footerDescription);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", STORE_CONFIG.name);
  });

  test("admin Save updates storefront, footer, SEO and Auth without stale branding", async ({ page }) => {
    await page.goto("/shop"); // populate the router cache before saving
    await page.goto("/login");
    await page.getByLabel("E-mail", { exact: true }).fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel("Parolă", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Autentificare", exact: true }).click();
    await expect(page).not.toHaveURL(/\/login/);
    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "Store Settings" })).toBeVisible();
    await page.getByLabel("Nume magazin", { exact: true }).fill(brand);
    await page.getByLabel("Tagline", { exact: true }).fill("Tagline din Settings");
    await page.getByLabel("Descriere scurtă", { exact: true }).fill("Descriere din Settings");
    await page.getByLabel("Descriere SEO", { exact: true }).fill("SEO din Settings");
    await page.getByLabel("Descriere footer", { exact: true }).fill("Footer din Settings");
    await page.getByLabel("Email public", { exact: true }).fill("public-settings@example.com");
    await page.getByLabel("Instagram (HTTPS)", { exact: true }).fill("https://www.instagram.com/demo");
    await page.getByRole("button", { name: "Salvează setările" }).click();
    await expect(page.getByRole("status")).toContainText("Setările au fost salvate");
    await expect(page.getByLabel("Nume magazin", { exact: true })).toHaveValue(brand);
    await expect(page.locator("header")).toContainText(brand);
    await page.getByRole("link", { name: "Magazin", exact: true }).click();
    await expect(page.locator("header")).toContainText(brand);
    await expect(page.locator("footer")).toContainText("Footer din Settings");
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", brand);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", "SEO din Settings");
    await expect(page.getByRole("link", { name: "public-settings@example.com" })).toHaveAttribute("href", "mailto:public-settings@example.com");
    await page.goto("/login");
    await expect(page).toHaveTitle(`Autentificare | ${brand}`);
    await expect(page.getByText(brand, { exact: true })).toBeVisible();
  });

  test("customer is refused and invalid URLs do not persist", async ({ page }) => {
    const denied = await customer.rpc("save_store_settings", params({ display_name: "Attack" }));
    expect(denied.error).toBeNull();
    expect(denied.data).toMatchObject({ success: false, code: "unauthorized" });
    expect((await customer.from("store_settings").update({ display_name: "Attack" }).eq("singleton", true)).error).not.toBeNull();
    expect((await admin.rpc("save_store_settings", params({ instagram_url: "javascript:alert(1)" }))).data).toMatchObject({ success: false, code: "invalid_request" });
    await page.goto("/login");
    await page.getByLabel("E-mail", { exact: true }).fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel("Parolă", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Autentificare", exact: true }).click();
    await expect(page).not.toHaveURL(/\/login/);
    await page.goto("/admin/settings");
    await page.getByLabel("Instagram (HTTPS)", { exact: true }).fill("https://evil.example");
    await page.getByRole("button", { name: "Salvează setările" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("Verifică valorile");
    await expect(page.getByLabel("Instagram (HTTPS)", { exact: true })).toHaveAttribute("aria-invalid", "true");
    const row = await admin.rpc("get_public_store_settings");
    expect(row.data[0].display_name).toBe(brand);
    expect(row.data[0].instagram_url).toBe("https://www.instagram.com/demo");
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("E-mail", { exact: true }).fill(process.env.E2E_TEST_EMAIL!);
    await page.getByLabel("Parolă", { exact: true }).fill(process.env.E2E_TEST_PASSWORD!);
    await page.getByRole("button", { name: "Autentificare", exact: true }).click();
    await expect(page).not.toHaveURL(/\/login/);
    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/\/$/);
  });

  test("public projection feeds the same operational email renderer", async () => {
    const { data, error } = await customer.rpc("get_public_store_settings");
    expect(error).toBeNull();
    expect(Object.keys(data[0]).sort()).toEqual([...SETTING_KEYS].sort());
    const store = resolveStoreSettings(data[0]);
    const email = renderOperationalEmail("ready", { publicNumber: "CMD-TEST", confirmationUrl: "https://example.com/order", shippingMethodName: "Test", paymentMethod: "card", statusLabel: "Confirmată", totalMinor: 1000, currency: "RON", recipientName: "Test", city: "Iași", county: "Iași", items: [], shipment: null }, store);
    expect(email.text).toContain(brand);
    expect(email.html).toContain(brand);
    expect(email.text).not.toContain("public-settings@example.com");
  });
});
