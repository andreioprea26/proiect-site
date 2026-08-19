import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
});

test("pagina afișează formularul de autentificare", async ({ page }) => {
  await expect(
    page.getByRole("heading", { level: 1, name: "Autentificare" }),
  ).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Parolă")).toBeVisible();
  await expect(page.getByRole("link", { name: "Creează unul" })).toHaveAttribute(
    "href",
    "/register",
  );
});

test("validează e-mailul înainte de autentificare", async ({ page }) => {
  await page.getByLabel("E-mail").fill("email-invalid");
  await page.getByLabel("Parolă").fill("parola-test");
  await page.getByRole("button", { name: "Autentificare" }).click();

  await expect(
    page.getByText("Introdu o adresă de e-mail validă.", { exact: true }),
  ).toBeVisible();
});

test("parola este obligatorie", async ({ page }) => {
  await page.getByLabel("E-mail").fill("client@example.com");
  await page.getByRole("button", { name: "Autentificare" }).click();

  await expect(page.getByText("Introdu parola.", { exact: true })).toBeVisible();
});

test("afișează o eroare sigură pentru date incorecte", async ({ page }) => {
  await page.getByLabel("E-mail").fill("cont-inexistent@example.com");
  await page.getByLabel("Parolă").fill("parola-incorecta");
  await page.getByRole("button", { name: "Autentificare" }).click();

  await expect(
    page.getByText("E-mailul sau parola sunt incorecte.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /invalid_credentials|stack|access_token|refresh_token/i,
  );
});
