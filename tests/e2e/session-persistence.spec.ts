import { expect, test } from "@playwright/test";

test("paginile publice rămân accesibile fără sesiune după reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Autentificare" }),
  ).toBeVisible();

  await page.reload();

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Obiecte handmade pentru gesturi care rămân.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Autentificare" }),
  ).toBeVisible();
});

test("navigarea publică nu creează o sesiune și nu produce erori", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Autentificare" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByRole("link", { name: "Creează unul" }).click();
  await expect(page).toHaveURL(/\/register$/);

  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Creează un cont" }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /Application error|Internal Server Error/i,
  );
});

test("o valoare de cookie nerecunoscută nu blochează rutele publice", async ({
  context,
  page,
}) => {
  await context.addCookies([
    {
      name: "sb-invalid-auth-token",
      value: "valoare-invalida",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);

  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("link", { name: "Autentificare" }),
  ).toBeVisible();
});
