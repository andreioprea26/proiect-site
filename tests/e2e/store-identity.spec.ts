import { expect, test } from "@playwright/test";
import { STORE_CONFIG, storeText, storeTitle } from "../../src/lib/config/store";

test("public storefront and metadata share the central identity", async ({ page }) => {
  await page.goto("/shop");
  await expect(page).toHaveTitle(storeTitle("Magazin"));
  await expect(page.locator("header").getByRole("link", { name: STORE_CONFIG.name, exact: true })).toBeVisible();
  await expect(page.locator("footer")).toContainText(STORE_CONFIG.name);
  await expect(page.locator("footer")).toContainText(STORE_CONFIG.footerDescription);
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", STORE_CONFIG.name);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", STORE_CONFIG.seoDescription);
});

test("Auth public screens share identity without changing private robots", async ({ page }) => {
  for (const [path, title] of [["/login", "Autentificare"], ["/register", "Înregistrare"], ["/forgot-password", "Am uitat parola"], ["/auth/confirmed", "Confirmare e-mail"]]) {
    await page.goto(path);
    await expect(page).toHaveTitle(storeTitle(title));
    await expect(page.getByText(STORE_CONFIG.name, { exact: true })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    if (path === "/login") await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", storeText().loginDescription);
    if (path === "/register") await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", storeText().registerDescription);
  }
});
