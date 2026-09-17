import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { STORE_CONFIG, storeTitle, storeText, storeMetadata } from "../../src/lib/config/store.ts";
import { NOTIFICATION_TYPES, renderOperationalEmail } from "../../src/lib/email/templates.ts";

const brands = [
  { ...STORE_CONFIG, name: "Bijuterii Demo", tagline: "Accesorii demo", description: "Catalog fictiv de bijuterii", seoDescription: "Bijuterii pentru teste", footerDescription: "Footer bijuterii" },
  { ...STORE_CONFIG, name: "Lumânări Demo", tagline: "Lumini demo", description: "Catalog fictiv de lumânări", seoDescription: "Lumânări pentru teste", footerDescription: "Footer lumânări" },
];
const order = {
  publicNumber: "CMD-TEST", confirmationUrl: "https://example.com/order-confirmation/test",
  shippingMethodName: "Curier test", paymentMethod: "card", statusLabel: "Confirmată",
  totalMinor: 1000, currency: "RON", recipientName: "Test", city: "Iași", county: "Iași",
  items: [{ productName: "Produs test", quantity: 1, lineSubtotalMinor: 1000 }], shipment: null,
};

for (const config of brands) {
  test(`${config.name}: same helpers derive public copy, Auth and SEO`, () => {
    assert.equal(storeTitle("Magazin", config), `Magazin | ${config.name}`);
    const text = storeText(config);
    assert.equal(text.defaultTitle, `${config.name} | ${config.tagline}`);
    assert.equal(text.titleTemplate, `%s | ${config.name}`);
    for (const field of ["loginDescription", "registerDescription", "contactDescription"]) assert.ok(text[field].includes(config.name));
    const metadata = storeMetadata(config);
    assert.equal(metadata.title, config.name);
    assert.equal(metadata.description, config.seoDescription);
    assert.equal(metadata.applicationName, config.name);
    assert.equal(metadata.openGraph.siteName, config.name);
    assert.equal(metadata.openGraph.description, config.seoDescription);
    assert.equal(metadata.twitter.title, config.name);
    assert.equal(metadata.twitter.description, config.seoDescription);
    assert.equal(metadata.metadataBase, undefined);
  });
  test(`${config.name}: all operational emails use injected identity without changing order semantics`, () => {
    for (const type of NOTIFICATION_TYPES) {
      const email = renderOperationalEmail(type, order, config);
      const baseline = renderOperationalEmail(type, order);
      assert.ok(email.html.includes(config.name));
      assert.ok(email.text.endsWith(config.name));
      assert.ok(!email.html.includes(STORE_CONFIG.name));
      assert.equal(email.subject, baseline.subject);
      assert.equal(email.text.replaceAll(config.name, STORE_CONFIG.name), baseline.text);
      assert.equal(email.html.replaceAll(config.name, STORE_CONFIG.name), baseline.html);
    }
  });
}

test("public asset fallback and different brand outputs", () => {
  assert.notDeepEqual(storeText(brands[0]), storeText(brands[1]));
  assert.notDeepEqual(storeMetadata(brands[0]), storeMetadata(brands[1]));
  assert.deepEqual(storeMetadata().openGraph.images, ["/brand-og"]);
  const metadata = storeMetadata({ ...brands[0], assets: { ...STORE_CONFIG.assets, ogImage: "/branding/demo-og.png" } });
  assert.deepEqual(metadata.openGraph.images, ["/branding/demo-og.png"]);
  assert.deepEqual(metadata.twitter.images, ["/branding/demo-og.png"]);
});

test("brand HTML is escaped, while plain text remains literal", () => {
  const name = '<img src=x onerror="alert(1)"> & \'test\'';
  const email = renderOperationalEmail("ready", order, { ...STORE_CONFIG, name });
  assert.ok(email.text.endsWith(name));
  assert.ok(email.html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#039;test&#039;"));
  assert.ok(!email.html.includes(name));
});

test("config is versioned, serializable, DB/env independent and fixes the RO contract", () => {
  assert.equal(STORE_CONFIG.version, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(STORE_CONFIG)), STORE_CONFIG);
  assert.deepEqual(STORE_CONFIG.market, { locale: "ro-RO", country: "RO", currency: "RON", timeZone: "Europe/Bucharest" });
  const source = readFileSync(new URL("../../src/lib/config/store.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /process\.env|fetch\(|supabase|stripe|resend|server-only/i);
  assert.deepEqual(source.match(/^import .*$/gm), ['import type { Metadata } from "next";', 'import { brandAsset, type ThemeName } from "./theme.ts";']);
  const theme = readFileSync(new URL("../../src/lib/config/theme.ts", import.meta.url), "utf8");
  assert.doesNotMatch(theme, /^import |process\.env|fetch\(|supabase|stripe|resend|server-only/im);
});

test("rebranding preserves historical cart and checkout browser keys", () => {
  const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
  assert.match(read("src/lib/cart/model.ts"), /CART_STORAGE_KEY = "handmade-store-cart-v1"/);
  for (const path of ["src/app/(storefront)/_components/checkout-form.tsx", "src/app/(storefront)/order-confirmation/[token]/card-cart-confirmation.tsx"]) {
    assert.ok(read(path).includes("brand-handmade:card-checkout:"));
    assert.ok(!read(path).includes("STORE_CONFIG"));
  }
});
