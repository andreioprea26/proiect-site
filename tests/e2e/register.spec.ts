import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/register");
});

test("pagina afișează formularul de înregistrare", async ({ page }) => {
  await expect(
    page.getByRole("heading", { level: 1, name: "Creează un cont" }),
  ).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Parolă", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Confirmă parola")).toBeVisible();
});

test("validează e-mailul înainte de trimitere", async ({ page }) => {
  await page.getByLabel("E-mail").fill("email-invalid");
  await page.getByLabel("Parolă", { exact: true }).fill("parola-test");
  await page.getByLabel("Confirmă parola").fill("parola-test");
  await page.getByRole("button", { name: "Creează cont" }).click();

  await expect(
    page.getByText("Introdu o adresă de e-mail validă.", { exact: true }),
  ).toBeVisible();
});

test("respinge o parolă prea scurtă", async ({ page }) => {
  await page.getByLabel("E-mail").fill("client@example.com");
  await page.getByLabel("Parolă", { exact: true }).fill("scurta");
  await page.getByLabel("Confirmă parola").fill("scurta");
  await page.getByRole("button", { name: "Creează cont" }).click();

  await expect(
    page.getByText("Parola trebuie să aibă cel puțin 8 caractere.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("respinge parolele care nu coincid", async ({ page }) => {
  await page.getByLabel("E-mail").fill("client@example.com");
  await page.getByLabel("Parolă", { exact: true }).fill("parola-test");
  await page.getByLabel("Confirmă parola").fill("alta-parola");
  await page.getByRole("button", { name: "Creează cont" }).click();

  await expect(
    page.getByText("Parolele introduse nu coincid.", { exact: true }),
  ).toBeVisible();
});
