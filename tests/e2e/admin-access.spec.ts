import { expect, test } from "@playwright/test";

test("vizitatorul neautentificat este redirecționat de la admin la login", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Autentificare" }),
  ).toBeVisible();
});

test("un query param nu poate pretinde rolul admin", async ({ page }) => {
  await page.goto("/admin?role=admin&next=https%3A%2F%2Fexample.com");

  await expect(page).toHaveURL(/\/login$/);
  expect(new URL(page.url()).hostname).not.toBe("example.com");
});

test("un cookie inventat nu poate pretinde rolul admin", async ({
  context,
  page,
}) => {
  await context.addCookies([
    {
      name: "role",
      value: "admin",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);

  await page.goto("/admin");

  await expect(page).toHaveURL(/\/login$/);
});

test("redirectul de la admin nu afectează paginile publice", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Brand Handmade" }),
  ).toBeVisible();
  await expect(
    page.getByText("Magazinul este în pregătire.", { exact: true }),
  ).toBeVisible();
});
