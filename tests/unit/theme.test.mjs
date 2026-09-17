import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import { THEMES, getTheme, themeVariables, brandAsset } from "../../src/lib/config/theme.ts";
import { STORE_CONFIG, storeMetadata, storeOgImage } from "../../src/lib/config/store.ts";
import { resolveStoreSettings } from "../../src/lib/store-settings/model.ts";
import { NOTIFICATION_TYPES, renderOperationalEmail } from "../../src/lib/email/templates.ts";
import { TEST_BRANDS } from "../fixtures/brands.ts";

function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);

for (const [name, palette] of Object.entries(THEMES)) {
  test(`${name}: safe literal tokens, AA text and visible focus/borders`, () => {
    for (const color of Object.values(palette)) assert.match(color, /^#[0-9a-f]{6}$/);
    for (const [fg, bg] of [["foreground", "primary"], ["foreground", "hover"], ["foreground", "strong"], ["onStrong", "strong"], ["onStrong", "text"], ["text", "accent"], ["text", "background"], ["muted", "surface"], ["muted", "background"], ["primary", "tint"], ["primary", "background"], ["primary", "surface"]]) {
      assert.ok(contrast(palette[fg], palette[bg]) >= 4.5, `${fg}/${bg} ${contrast(palette[fg], palette[bg])}`);
    }
    for (const bg of ["surface", "background", "accent", "tint"]) {
      assert.ok(contrast(palette.focus, palette[bg]) >= 3, `focus/${bg}`);
      assert.ok(contrast(palette.border, palette[bg]) >= 3, `border/${bg}`);
    }
    assert.equal(themeVariables(name)["--brand-primary"], palette.primary);
  });
}
test("unknown themes and CSS injection fall back; DB cannot set theme/assets", () => {
  for (const value of [null, {}, "__proto__", "constructor", "red; background:url(https://example.com)", "var(--evil)"]) assert.equal(getTheme(value), THEMES.evergreen);
  const result = resolveStoreSettings({ display_name: "Nume admin", theme: "plum", assets: { logo: "//evil.test/logo.svg" } }, TEST_BRANDS[1]);
  assert.equal(result.name, "Nume admin");
  assert.equal(result.theme, "terracotta");
  assert.deepEqual(result.assets, TEST_BRANDS[1].assets);
  assert.deepEqual(resolveStoreSettings(null, TEST_BRANDS[0]), TEST_BRANDS[0]);
});
test("only reviewed flat local branding asset paths are accepted", () => {
  for (const value of ["https://evil.test/a.png", "//evil.test/a.png", "/branding/../a.png", "/branding/%2e%2e/a.png", "/branding/a.svg?x=1", "/branding/a.png#x", "/branding/a.html", "/branding/a.js", "data:image/png;base64,x", "/branding/a\\b.png", "/other/a.png", "/branding/a..png", '<img src="x">']) {
    for (const kind of ["logo", "icon", "ogImage"]) assert.equal(brandAsset(value, kind), null, value);
  }
  assert.equal(brandAsset("/branding/demo-v2.svg", "logo"), "/branding/demo-v2.svg");
  assert.equal(brandAsset("/branding/demo.svg", "ogImage"), null);
  assert.equal(brandAsset("/branding/demo.ico", "logo"), null);
  for (const [kind, path] of Object.entries(STORE_CONFIG.assets)) if (path) assert.ok(existsSync(new URL(`../../public${brandAsset(path, kind)}`, import.meta.url)));
});
test("OG resource > brand > static fallback and configurable icon", () => {
  assert.equal(storeOgImage(TEST_BRANDS[0], "https://example.com/product.png"), "https://example.com/product.png");
  for (const brand of TEST_BRANDS) {
    assert.equal(storeOgImage(brand), brand.assets.ogImage);
    assert.equal(storeMetadata(brand).icons.icon, brand.assets.icon);
    assert.deepEqual(storeMetadata(brand).openGraph.images, [brand.assets.ogImage]);
    assert.equal(storeMetadata(brand).openGraph.description, brand.seoDescription);
  }
  assert.equal(storeOgImage(), "/brand-og");
  assert.equal(storeOgImage({ ...STORE_CONFIG, assets: { ...STORE_CONFIG.assets, ogImage: "//evil.test/x.png" } }), "/brand-og");
  assert.equal(storeMetadata().icons.icon, "/branding/icon.svg");
  assert.equal(existsSync(new URL("../../src/app/favicon.ico", import.meta.url)), false, "file-based icon must not override configured metadata");
});
test("both fictitious identities use the same email renderer and controlled palette", () => {
  const order = { publicNumber: "TEST", confirmationUrl: "https://example.com/order", shippingMethodName: "Test", paymentMethod: "card", statusLabel: "Confirmată", totalMinor: 1000, currency: "RON", recipientName: "Test", city: "Test", county: "Test", items: [], shipment: null };
  for (const brand of TEST_BRANDS) for (const type of NOTIFICATION_TYPES) {
    const email = renderOperationalEmail(type, order, brand);
    assert.ok(email.html.includes(getTheme(brand.theme).primary));
    assert.ok(email.html.includes(brand.name));
    assert.ok(!email.html.includes('<img'), "email works without logo/remote images");
    assert.equal(email.subject, renderOperationalEmail(type, order).subject);
  }
});
test("global-error CSS fallback matches default palette exactly", () => {
  const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");
  for (const [key, value] of Object.entries(themeVariables("evergreen"))) assert.ok(css.includes(`${key}: ${value};`), key);
});
