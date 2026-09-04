import { expect, test } from "@playwright/test";

import { E2E_APP_URL } from "./test-environment";

test("callback-ul fără parametri afișează o eroare sigură", async ({ page }) => {
  await page.goto("/auth/confirm");

  await expect(page).toHaveURL(/\/auth\/confirmed\?status=error$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Confirmarea nu a reușit" }),
  ).toBeVisible();
});

test("callback-ul respinge un tip neacceptat", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=token-test&type=recovery");

  await expect(page).toHaveURL(/\/auth\/confirmed\?status=error$/);
});

test("callback-ul tratează sigur un token invalid", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=token-invalid&type=email");

  await expect(page).toHaveURL(/\/auth\/confirmed\?status=error$/);
  await expect(page.getByText(/invalid sau a expirat/)).toBeVisible();
});

test("callback-ul tratează sigur un cod PKCE invalid", async ({ page }) => {
  await page.goto("/auth/confirm?code=cod-invalid");

  await expect(page).toHaveURL(/\/auth\/confirmed\?status=error$/);
  await expect(page.getByText(/invalid sau a expirat/)).toBeVisible();
});

test("callback-ul nu urmează o destinație externă furnizată de utilizator", async ({
  page,
}) => {
  await page.goto(
    "/auth/confirm?next=https%3A%2F%2Fexample.com%2Fcapcana&type=recovery&token_hash=token-test",
  );

  await expect(page).toHaveURL(/\/auth\/confirmed\?status=error$/);
  expect(new URL(page.url()).hostname).not.toBe("example.com");
});

test("callback-ul nu construiește redirectul din host-ul proxy", async ({ request }) => {
  const response = await request.get("/auth/confirm", {
    headers: {
      "x-forwarded-host": "attacker.example",
      "x-forwarded-proto": "https",
    },
    maxRedirects: 0,
  });

  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);
  const location = response.headers().location;
  expect(location).toBeTruthy();
  expect(new URL(location!).origin).toBe(E2E_APP_URL);
  expect(new URL(location!).hostname).not.toBe("attacker.example");
});

test("pagina de succes oferă acces la autentificare", async ({
  page,
}) => {
  await page.goto("/auth/confirmed?status=success");

  await expect(
    page.getByRole("heading", { level: 1, name: "E-mail confirmat" }),
  ).toBeVisible();
  await expect(
    page.getByText("Adresa ta de e-mail a fost confirmată. Acum te poți autentifica."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Mergi la autentificare" }),
  ).toHaveAttribute("href", "/login");
});

test("pagina de eroare nu expune detalii sensibile", async ({ page }) => {
  await page.goto("/auth/confirmed?status=error");

  await expect(page.getByText(/invalid sau a expirat/)).toBeVisible();
  await expect(page.getByText(/token-test/)).toHaveCount(0);
});
