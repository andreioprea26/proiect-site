import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { STORE_CONFIG, storeMetadata } from "../../src/lib/config/store.ts";
import { SETTING_KEYS, normalizeSettings, resolveStoreSettings, loadPublicSettings } from "../../src/lib/store-settings/model.ts";
import { renderOperationalEmail } from "../../src/lib/email/templates.ts";

test("missing row, empty fields and DB outage retain static fallback", async () => {
  assert.deepEqual(resolveStoreSettings(null), STORE_CONFIG);
  assert.deepEqual(resolveStoreSettings({ display_name: "  " }), STORE_CONFIG);
  assert.deepEqual(await loadPublicSettings(async () => { throw new Error("timeout"); }), STORE_CONFIG);
  assert.deepEqual(await loadPublicSettings(async () => null), STORE_CONFIG);
});
test("normalization trims and returns only the fixed allowlist", () => {
  const { values, errors } = normalizeSettings({ display_name: "  Demo  ", APP_URL: "https://evil.example", service_role: "never copy", singleton: true });
  assert.equal(values.display_name, "Demo");
  assert.deepEqual(errors, {});
  assert.deepEqual(Object.keys(values).sort(), [...SETTING_KEYS].sort());
  const resolved = resolveStoreSettings({ name: "injected", market: { currency: "USD" }, display_name: "Demo" });
  assert.equal(resolved.name, "Demo");
  assert.deepEqual(resolved.market, STORE_CONFIG.market);
});
test("plain text length, HTML, email and phone constraints reject invalid fields", () => {
  for (const [key, value] of [["display_name", "x".repeat(121)], ["tagline", "<script>x</script>"], ["public_email", "bad"], ["public_phone", "abc"], ["whatsapp", "+12"], ["short_description", "control\u0000value"]]) {
    assert.ok(normalizeSettings({ [key]: value }).errors[key]);
    assert.deepEqual(resolveStoreSettings({ [key]: value }), STORE_CONFIG);
  }
});
test("social platforms only accept HTTPS host and plain paths", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,x", "http://instagram.com", "https://instagram.com.evil.test", "https://user@instagram.com", "https://instagram.com:443", "https://instagram.com/a?q=b", "https://instagram.com/a#b", "https://instagram.com/%2f%2fevil", "//instagram.com"]) {
    assert.ok(normalizeSettings({ instagram_url: value }).errors.instagram_url, value);
  }
  for (const platform of ["instagram", "facebook", "tiktok"]) {
    assert.deepEqual(normalizeSettings({ [`${platform}_url`]: `https://www.${platform}.com/@demo` }).errors, {});
  }
});
test("DB overrides drive SEO and email branding without controlling sender or operational data", async () => {
  const store = await loadPublicSettings(async () => ({ display_name: "Demo & Co", seo_description: "SEO din DB", public_email: "public@example.com" }));
  assert.equal(storeMetadata(store).openGraph.siteName, "Demo & Co");
  assert.equal(storeMetadata(store).description, "SEO din DB");
  const order = { publicNumber: "CMD-TEST", confirmationUrl: "https://example.com/order", shippingMethodName: "Test", paymentMethod: "card", statusLabel: "Confirmată", totalMinor: 1000, currency: "RON", recipientName: "Test", city: "Iași", county: "Iași", items: [], shipment: null };
  const email = renderOperationalEmail("ready", order, store);
  assert.ok(email.html.includes("Demo &amp; Co"));
  assert.ok(email.text.endsWith("Demo & Co"));
  assert.equal(email.subject, renderOperationalEmail("ready", order).subject);
  assert.ok(!email.html.includes("public@example.com"));
});
test("save invalidates root layout and critical errors retain DB-free static identity", () => {
  const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
  assert.ok(read("src/app/admin/settings/actions.ts").includes('revalidatePath("/", "layout")'));
  assert.ok(!read("src/app/global-error.tsx").includes("store-settings"));
  const server = read("src/lib/store-settings/server.ts");
  assert.ok(server.includes('cache: "no-store"'));
  assert.ok(server.includes("AbortSignal.timeout(2000)"));
  assert.ok(!server.includes("createAdminClient"));
  const notification = read("src/lib/email/notifications.ts");
  assert.ok(notification.includes("renderOperationalEmail(input.type, snapshot, await getPublicStoreSettings())"));
  assert.ok(notification.includes("from: environment.from"));
  assert.ok(notification.includes("replyTo: environment.replyTo"));
});
