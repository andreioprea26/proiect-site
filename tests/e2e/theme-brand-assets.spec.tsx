import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StoreBrand } from "../../src/components/store-brand";
import { HeroBlock } from "../../src/app/(storefront)/_components/hero-block";
import { ProductCard } from "../../src/app/(storefront)/_components/product-card";
import { TEST_BRANDS } from "../fixtures/brands";
import { STORE_CONFIG, storeMetadata } from "../../src/lib/config/store";
import { themeVariables, getTheme } from "../../src/lib/config/theme";

const rgb = (hex: string) => `rgb(${hex.slice(1).match(/../g)!.map((part) => parseInt(part, 16)).join(", ")})`;
async function product(request: APIRequestContext) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || new URL(url).hostname !== "bdyocajhhylvasfhmnal.supabase.co") throw new Error("Approved Development configuration required");
  const response = await request.get(`${url}/rest/v1/products?select=name,slug&publication_status=eq.published&order=created_at.asc&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  expect(response.ok()).toBe(true);
  const rows = await response.json();
  expect(rows.length, "Published Development fixture is required; never skip").toBe(1);
  return rows[0] as { name: string; slug: string };
}
async function palette(page: Page, theme: string) {
  await page.evaluate((values) => { for (const [key, value] of Object.entries(values)) document.documentElement.style.setProperty(key, value); }, themeVariables(theme));
}

for (const brand of TEST_BRANDS) {
  test(`${brand.name}: shared production logo, hero and product card render distinct identity`, async ({ page }, testInfo) => {
    await page.goto("/");
    const styles = await page.locator('link[rel="stylesheet"]').evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href));
    expect(styles.length).toBeGreaterThan(0);
    await page.route("**/branding/iris.svg", (route) => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="48" viewBox="0 0 192 48"><path d="M20 6 36 24 20 42 4 24Z" fill="#701a75"/><text x="45" y="31" font-size="25" fill="#701a75">Iris</text></svg>' }));
    const logo = renderToStaticMarkup(createElement(StoreBrand, { name: brand.name, logo: brand.assets.logo }));
    const hero = renderToStaticMarkup(createElement(HeroBlock, { store: brand, block: { slot: "hero", eyebrow: brand.tagline, title: brand.copy.heroTitle, subtitle: brand.description, ctaLabel: "Descoperă Magazinul", ctaHref: "/shop", isActive: true, displayOrder: 0, isConfigured: false } }));
    const card = renderToStaticMarkup(createElement(ProductCard, { product: { id: "fixture", name: brand.theme === "plum" ? "Pandantiv demo" : "Lumânare demo", slug: "fixture", description: null, basePrice: 50, displayPrice: 50, hasVariantPricing: false, productType: "standard", availabilityStatus: "in_stock", isCustomizable: false, leadTimeDays: null, createdAt: "2026-01-01", categoryIds: [], collectionIds: [], image: null } }));
    // Component harness only, not a duplicate app or a public test route. Production CSS.
    await page.setContent(`<html lang="ro"><head>${styles.map((href) => `<link rel="stylesheet" href="${href}">`).join("")}</head><body><header>${logo}</header>${hero}<main style="max-width:340px;margin:24px">${card}</main></body></html>`);
    await palette(page, brand.theme);
    await expect(page.getByRole("heading", { name: brand.copy.heroTitle })).toBeVisible();
    await expect(page.getByText(brand.description, { exact: true })).toBeVisible();
    if (brand.assets.logo) {
      const img = page.getByRole("img", { name: brand.name });
      await expect(img).toBeVisible();
      await expect.poll(() => img.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      expect(await img.boundingBox()).toMatchObject({ width: 192, height: 48 });
    } else {
      await expect(page.locator('[data-store-brand="text"]')).toHaveText(brand.name);
      await expect(page.locator("header img")).toHaveCount(0);
    }
    await expect(page.getByRole("link", { name: "Descoperă Magazinul" })).toHaveCSS("background-color", rgb(getTheme(brand.theme).primary));
    await expect(page.locator('[data-testid="product-card"] .text-brand')).toHaveCSS("color", rgb(getTheme(brand.theme).primary));
    expect(storeMetadata(brand).openGraph).toMatchObject({ siteName: brand.name, description: brand.seoDescription, images: [brand.assets.ogImage] });
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${brand.theme}-${width}.png`), fullPage: true });
    }
  });

  test(`${brand.theme}: live routes consume the same tokens; mobile, focus and disabled states`, async ({ page, request }) => {
    const item = await product(request);
    await page.setViewportSize({ width: 375, height: 812 });
    for (const path of ["/", "/shop", `/products/${item.slug}`, "/cart", "/checkout", "/login", "/register", "/forgot-password"]) {
      await page.goto(path);
      await palette(page, brand.theme);
      await expect(page.locator("body")).toHaveCSS("background-color", rgb(getTheme(brand.theme).background));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
      const cta = page.locator(".bg-brand").first();
      await expect(cta, `${path} primary CTA`).toHaveCSS("background-color", rgb(getTheme(brand.theme).primary));
      if (await page.locator("footer").count()) await expect(page.locator("footer")).toHaveCSS("background-color", rgb(getTheme(brand.theme).strong));
    }
    await page.goto("/login");
    await palette(page, brand.theme);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Sari la conținut" })).toBeFocused();
    await expect(page.getByRole("link", { name: "Sari la conținut" })).toHaveCSS("outline-color", rgb(getTheme(brand.theme).focus));
    const button = page.getByRole("button", { name: "Autentificare", exact: true });
    await button.evaluate((node) => { (node as HTMLButtonElement).disabled = true; });
    await expect(button).toBeDisabled();
    await expect(button).toHaveCSS("opacity", "0.6");
  });
}

test("default brand fallback, favicon and static OG are served without starter metadata", async ({ page, request }) => {
  await page.goto("/shop");
  await expect(page.locator('header [data-store-brand="text"]')).toHaveText(STORE_CONFIG.name);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/branding/icon.svg");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/brand-og$/);
  const icon = await request.get("/branding/icon.svg");
  expect(icon.ok()).toBe(true);
  expect(icon.headers()["content-type"]).toContain("image/svg+xml");
  const og = await request.get("/brand-og");
  expect(og.ok()).toBe(true);
  expect(og.headers()["content-type"]).toContain("image/png");
  expect((await og.body()).subarray(1, 4).toString()).toBe("PNG");
});

test("logo alt is escaped and unsafe assets fall back to text", () => {
  const name = '<img src=x onerror="alert(1)">';
  const html = renderToStaticMarkup(createElement(StoreBrand, { name, logo: "/branding/safe.svg" }));
  expect(html).toContain("&lt;img");
  expect(html).not.toContain('alt="<img');
  for (const logo of [null, "https://example.com/x.svg", "/branding/../x.svg", "data:image/svg+xml,x"]) {
    const rendered = renderToStaticMarkup(createElement(StoreBrand, { name: "Fallback", logo }));
    expect(rendered).toContain('data-store-brand="text"');
    expect(rendered).not.toContain("<img");
  }
});

test("product OG keeps resource title, description and own image precedence", async ({ page, request }) => {
  const item = await product(request);
  await page.goto(`/products/${item.slug}`);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", item.name);
  const data = JSON.parse((await page.locator('[data-testid="product-structured-data"]').textContent())!);
  const image = data.image?.[0];
  if (image) await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", image);
  else await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /\/brand-og$/);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", data.description?.slice(0, 160) ?? `Descoperă produsul ${item.name}.`);
});

test("account and admin shell consume controlled palettes without exposing theme editing", async ({ page }) => {
  if (!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD) throw new Error("Admin test credentials required");
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(process.env.E2E_ADMIN_EMAIL);
  await page.getByLabel("Parolă", { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Autentificare", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
  for (const brand of TEST_BRANDS) {
    await page.goto("/account");
    await palette(page, brand.theme);
    await expect(page.locator("header a").first()).toHaveCSS("color", rgb(getTheme(brand.theme).primary));
    await page.goto("/admin/settings");
    await palette(page, brand.theme);
    await expect(page.locator('header a[href="/admin"]')).toHaveCSS("color", rgb(getTheme(brand.theme).onStrong));
    await expect(page.getByText("Nu există upload de branding sau CSS personalizat.", { exact: false })).toBeVisible();
    await expect(page.locator('input[type="file"], input[type="color"]')).toHaveCount(0);
  }
});
