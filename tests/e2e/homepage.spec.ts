import { expect, test } from "@playwright/test";

test("homepage-ul afișează mesajul de pregătire", async ({ page }) => {
  const response = await page.goto("/");

  expect(response).not.toBeNull();
  expect(response?.ok()).toBe(true);

  await expect(
    page.getByRole("heading", { level: 1, name: "Brand Handmade" }),
  ).toBeVisible();
  await expect(
    page.getByText("Magazinul este în pregătire.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Autentificare" }),
  ).toHaveAttribute("href", "/login");

  await expect(page.locator("body")).not.toContainText(
    /Application error|Internal Server Error|This page could not be found/i,
  );
});
