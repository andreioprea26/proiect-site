import { expect, test } from "@playwright/test";

test("homepage-ul public afișează storefront-ul și navigarea", async ({ page }) => {
  test.setTimeout(60_000);
  const response = await page.goto("/");

  expect(response).not.toBeNull();
  expect(response?.ok()).toBe(true);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Obiecte handmade pentru gesturi care rămân.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navigare principală" }),
  ).toContainText("Magazin");
  await expect(page.getByRole("link", { name: "Descoperă Magazinul" })).toHaveAttribute(
    "href",
    "/shop",
  );

  await expect(page.locator("body")).not.toContainText(
    /Application error|Internal Server Error|This page could not be found/i,
  );
});
