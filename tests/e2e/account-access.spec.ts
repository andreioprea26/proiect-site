import { expect, test } from "@playwright/test";

for (const route of ["/account", "/account/profile", "/account/addresses"]) {
  test(`${route} redirecționează vizitatorul neautentificat la login`, async ({ page }) => {
    await page.goto(route);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { level: 1, name: "Autentificare" })).toBeVisible();
  });
}

test("layout-ul admin rămâne protejat", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/login$/);
});
