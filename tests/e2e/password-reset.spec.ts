import { expect, test } from "@playwright/test";

import {
  PASSWORD_RESET_REQUEST_MESSAGE,
  validatePasswordResetFields,
} from "../../src/lib/auth/password-reset";

test("pagina de login oferă acces la resetarea parolei", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("link", { name: "Ai uitat parola?" })).toHaveAttribute(
    "href",
    "/forgot-password",
  );
});

test("pagina de login afișează confirmarea resetării reușite", async ({
  page,
}) => {
  await page.goto("/login?passwordReset=success");

  await expect(
    page.getByText(
      "Parola a fost schimbată. Acum te poți autentifica folosind parola nouă.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("pagina pentru parola uitată afișează formularul și linkul către login", async ({
  page,
}) => {
  await page.goto("/forgot-password");

  await expect(
    page.getByRole("heading", { level: 1, name: "Resetează parola" }),
  ).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Trimite instrucțiunile" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Înapoi la autentificare" }),
  ).toHaveAttribute("href", "/login");
});

test("validează adresa de e-mail înainte de solicitare", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("E-mail").fill("email-invalid");
  await page.getByRole("button", { name: "Trimite instrucțiunile" }).click();

  await expect(
    page.getByText("Introdu o adresă de e-mail validă.", { exact: true }),
  ).toBeVisible();
});

test("afișează mesajul generic după o solicitare acceptată", async ({ page }) => {
  await page.route("**/auth/v1/recover**", async (route) => {
    await route.fulfill({
      body: "{}",
      contentType: "application/json",
      status: 200,
    });
  });
  await page.goto("/forgot-password");
  await page.getByLabel("E-mail").fill("client@example.com");
  await page.getByRole("button", { name: "Trimite instrucțiunile" }).click();

  await expect(page.getByText(PASSWORD_RESET_REQUEST_MESSAGE)).toBeVisible();
});

test("nu expune eroarea furnizorului și păstrează același mesaj generic", async ({
  page,
}) => {
  await page.route("**/auth/v1/recover**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        code: "over_email_send_rate_limit",
        message: "provider detail that must stay private",
      }),
      contentType: "application/json",
      status: 429,
    });
  });
  await page.goto("/forgot-password");
  await page.getByLabel("E-mail").fill("necunoscut@example.com");
  await page.getByRole("button", { name: "Trimite instrucțiunile" }).click();

  await expect(page.getByText(PASSWORD_RESET_REQUEST_MESSAGE)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    "provider detail that must stay private",
  );
});

test("respinge în siguranță pagina fără o sesiune recovery", async ({ page }) => {
  await page.goto("/reset-password");

  await expect(
    page.getByRole("heading", { level: 1, name: "Alege o parolă nouă" }),
  ).toBeVisible();
  await expect(page.getByText(/invalid sau a expirat/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Solicită un link nou" }),
  ).toHaveAttribute("href", "/forgot-password");
  await expect(page.getByRole("button", { name: "Salvează parola nouă" })).toHaveCount(
    0,
  );
});

test("callback-ul fără cod este tratat ca recovery invalid", async ({ page }) => {
  await page.goto("/auth/reset-password");

  await expect(page).toHaveURL(/\/reset-password\?status=error$/);
  await expect(page.getByText(/invalid sau a expirat/)).toBeVisible();
});

test("callback-ul nu urmează un redirect extern furnizat de vizitator", async ({
  page,
}) => {
  await page.goto(
    "/auth/reset-password?next=https%3A%2F%2Fexample.com%2Fcapcana",
  );

  await expect(page).toHaveURL(/\/reset-password\?status=error$/);
  expect(new URL(page.url()).hostname).not.toBe("example.com");
});

test("respinge o parolă nouă prea scurtă", () => {
  expect(
    validatePasswordResetFields({
      password: "scurta",
      confirmPassword: "scurta",
    }),
  ).toEqual({
    password: "Parola trebuie să aibă cel puțin 8 caractere.",
  });
});

test("respinge parolele noi care nu coincid", () => {
  expect(
    validatePasswordResetFields({
      password: "parola-noua",
      confirmPassword: "alta-parola",
    }),
  ).toEqual({
    confirmPassword: "Parolele introduse nu coincid.",
  });
});
