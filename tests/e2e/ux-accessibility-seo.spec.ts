import { expect, type APIRequestContext, type Page, test } from "@playwright/test";

type PublicProduct = { name: string; slug: string };

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "";

function publicSupabaseSettings() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Suita 9B necesită configurația Supabase Development.");
  }
  return { url, publishableKey };
}

async function firstPublicProduct(request: APIRequestContext) {
  const { url, publishableKey } = publicSupabaseSettings();
  const endpoint = new URL("/rest/v1/products", url);
  endpoint.searchParams.set("select", "name,slug");
  endpoint.searchParams.set("publication_status", "eq.published");
  endpoint.searchParams.set("order", "created_at.asc");
  endpoint.searchParams.set("limit", "1");
  const response = await request.get(endpoint.toString(), {
    headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` },
  });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as PublicProduct[])[0] ?? null;
}

test("navigarea cu tastatura oferă acces direct la conținut", async ({ page }) => {
  await page.goto("/");
  const skipLink = page.getByRole("link", { name: "Sari la conținut" });
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("storefront-ul critic nu produce overflow la breakpoint-urile MVP", async ({ page, request }) => {
  const product = await firstPublicProduct(request);
  const routes = ["/", "/shop", "/cart", "/checkout"];
  if (product) routes.push(`/products/${product.slug}`);

  for (const viewport of [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("h1")).toHaveCount(1);
      const overflow = await page.evaluate(() => ({
        hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        offenders: [...document.querySelectorAll("body *")]
          .filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
          .slice(0, 5)
          .map((element) => ({
            className: element.getAttribute("class"),
            tagName: element.tagName,
          })),
      }));
      expect(
        overflow.hasOverflow,
        `${route} are overflow la ${viewport.width}px: ${JSON.stringify(overflow.offenders)}`,
      ).toBe(false);
    }
  }
});

test("formularele critice au controale etichetate", async ({ page }) => {
  for (const route of ["/login", "/register", "/contact", "/custom-orders", "/checkout"]) {
    await page.goto(route);
    const missingLabels = await page.locator("input:not([type=hidden]), select, textarea").evaluateAll(
      (controls) =>
        controls
          .filter((control) => !(control as HTMLInputElement).labels?.length && !control.getAttribute("aria-label") && !control.getAttribute("aria-labelledby"))
          .map((control) => control.getAttribute("name") ?? control.tagName),
    );
    expect(missingLabels, `${route} conține controale fără nume accesibil`).toEqual([]);
  }
});

test("navigarea și listele admin rămân utilizabile pe mobil și desktop", async ({ page }) => {
  if (!adminEmail || !adminPassword) {
    throw new Error("Suita 9B necesită credențialele admin E2E.");
  }
  await loginAsAdmin(page);

  for (const viewport of [
    { width: 320, height: 720 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of ["/admin", "/admin/products", "/admin/orders"]) {
      await page.goto(route);
      await expect(page.getByRole("navigation", { name: "Navigare administrare" })).toBeVisible();
      const overflow = await page.evaluate(() => ({
        hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        offenders: [...document.querySelectorAll("body *")]
          .filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
          .slice(0, 5)
          .map((element) => ({
            className: element.getAttribute("class"),
            tagName: element.tagName,
          })),
      }));
      expect(
        overflow.hasOverflow,
        `${route} are overflow la ${viewport.width}px: ${JSON.stringify(overflow.offenders)}`,
      ).toBe(false);
    }
  }
});

test("metadata publică și paginile private folosesc regulile SEO corecte", async ({ page }) => {
  await page.goto("/shop?sort=price_asc");
  await expect(page).toHaveTitle("Magazin | Brand Handmade");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100/shop",
  );

  for (const route of ["/cart", "/checkout", "/login", "/register", "/forgot-password", "/reset-password"]) {
    await page.goto(route);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});

test("robots și sitemap publică numai rute indexabile", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  const robotsText = await robots.text();
  expect(robotsText).toContain("Disallow: /admin");
  expect(robotsText).toContain("Disallow: /checkout");
  expect(robotsText).toContain("Sitemap: http://127.0.0.1:3100/sitemap.xml");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain("<loc>http://127.0.0.1:3100/shop</loc>");
  for (const privatePath of ["/admin", "/account", "/cart", "/checkout", "/order-confirmation"]) {
    expect(sitemapText).not.toContain(`<loc>http://127.0.0.1:3100${privatePath}`);
  }
});

test("produsul public are canonical și structured data bazate pe date reale", async ({ page, request }) => {
  const product = await firstPublicProduct(request);
  if (!product) return;

  await page.goto(`/products/${product.slug}`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `http://127.0.0.1:3100/products/${product.slug}`,
  );
  const json = JSON.parse(
    (await page.getByTestId("product-structured-data").textContent()) ?? "{}",
  ) as Record<string, unknown>;
  expect(json["@type"]).toBe("Product");
  expect(json.name).toBe(product.name);
  expect(json).not.toHaveProperty("brand");
  expect(json.offers).toMatchObject({ "@type": "Offer", priceCurrency: "RON" });
});

test("rutele inexistente oferă 404 coerent și noindex", async ({ page }) => {
  const response = await page.goto("/pagina-care-nu-exista-9b");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Pagina nu a fost găsită" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(adminEmail);
  await page.getByLabel("Parolă").fill(adminPassword);
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
}
