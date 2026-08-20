import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { readProductFields, validateProductFields } from "../../src/lib/admin/catalog-validation";

const customerEmail = process.env.E2E_TEST_EMAIL ?? "";
const customerPassword = process.env.E2E_TEST_PASSWORD ?? "";
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

const hasCustomer = Boolean(customerEmail && customerPassword);
const hasAdmin = Boolean(adminEmail && adminPassword && supabaseUrl && supabaseKey);

test("validarea produsului respinge prețuri negative, enum-uri și IDs arbitrare", () => {
  const formData = new FormData();
  formData.set("name", "Produs test");
  formData.set("slug", "produs-test");
  formData.set("basePrice", "-1");
  formData.set("productType", "invalid");
  formData.set("publicationStatus", "published");
  formData.set("availabilityStatus", "in_stock");
  formData.append("categoryIds", "nu-este-uuid");

  const errors = validateProductFields(readProductFields(formData));

  expect(errors.basePrice).toBeTruthy();
  expect(errors.productType).toBeTruthy();
  expect(errors.categoryIds).toBeTruthy();
});

test("validarea produsului acceptă zero asocieri și valori conforme", () => {
  const formData = new FormData();
  formData.set("name", "Produs test");
  formData.set("slug", "produs-test");
  formData.set("basePrice", "0.00");
  formData.set("productType", "standard");
  formData.set("publicationStatus", "draft");
  formData.set("availabilityStatus", "unavailable");

  expect(validateProductFields(readProductFields(formData))).toEqual({});
});

test("un customer autentificat nu poate accesa administrarea catalogului", async ({ page }) => {
  test.skip(!hasCustomer, "Necesită contul customer E2E configurat.");

  await login(page, customerEmail, customerPassword);
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Brand Handmade" })).toBeVisible();
});

test.describe("catalog admin", () => {
  test.skip(!hasAdmin, "Necesită E2E_ADMIN_EMAIL și E2E_ADMIN_PASSWORD în .env.local.");
  test.describe.configure({ mode: "serial" });

  test("admin creează, editează și arhivează un produs cu categorie și colecție", async ({ page }) => {
    test.setTimeout(90_000);
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const categoryName = `Categorie E2E ${runId}`;
    const categorySlug = `categorie-e2e-${runId}`;
    const collectionName = `Colecție E2E ${runId}`;
    const collectionSlug = `colectie-e2e-${runId}`;
    const productName = `Produs E2E ${runId}`;
    const productSlug = `produs-e2e-${runId}`;

    try {
      await login(page, adminEmail, adminPassword);

      await page.goto("/admin/categories");
      await expect(page.getByRole("heading", { level: 1, name: "Categorii" })).toBeVisible();
      const categoryForm = page.getByRole("heading", { name: "Adaugă categoria" }).locator("..").locator("form");
      await categoryForm.getByLabel("Nume").fill(categoryName);
      await categoryForm.getByLabel("Slug").fill(categorySlug);
      await categoryForm.getByRole("button", { name: "Adaugă" }).click();
      await expect(page.locator("article").filter({ hasText: categoryName })).toBeVisible();

      await page.goto("/admin/collections");
      const collectionForm = page.getByRole("heading", { name: "Adaugă colecția" }).locator("..").locator("form");
      await collectionForm.getByLabel("Nume").fill(collectionName);
      await collectionForm.getByLabel("Slug").fill(collectionSlug);
      await collectionForm.getByRole("button", { name: "Adaugă" }).click();
      await expect(page.locator("article").filter({ hasText: collectionName })).toBeVisible();

      await page.goto("/admin/products/new");
      await page.getByLabel("Nume").fill(productName);
      await page.getByLabel("Slug").fill(productSlug);
      await page.getByLabel("Descriere").fill("Descriere inițială E2E");
      await page.getByLabel("Preț de bază (RON)").fill("125.50");
      await page.getByLabel("Tip produs").selectOption("made_to_order");
      await page.getByLabel("Disponibilitate").selectOption("made_to_order");
      await page.getByLabel("Status publicare").selectOption("draft");
      await page.getByLabel("Termen de realizare/expediere (zile)").fill("5");
      await page.getByLabel("Produs personalizabil").check();
      await page.getByLabel(categoryName).check();
      await page.getByLabel(collectionName).check();
      await page.getByRole("button", { name: "Creează produsul" }).click();

      await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]+\?created=1$/);
      await expect(page.getByText("Produsul a fost creat.")).toBeVisible();
      await expect(page.getByLabel(categoryName)).toBeChecked();
      await expect(page.getByLabel(collectionName)).toBeChecked();

      await page.getByLabel("Descriere").fill("Descriere actualizată E2E");
      await page.getByLabel("Preț de bază (RON)").fill("149.90");
      await page.getByLabel("Status publicare").selectOption("published");
      await page.getByRole("button", { name: "Salvează produsul" }).click();
      await expect(page.getByText("Produsul a fost actualizat.")).toBeVisible();
      await page.reload();
      await expect(page.getByLabel("Descriere")).toHaveValue("Descriere actualizată E2E");
      await expect(page.getByLabel("Status publicare")).toHaveValue("published");

      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "Arhivează produsul" }).click();
      await expect(page.getByLabel("Status publicare")).toHaveValue("archived");
      await expect(page.getByLabel("Disponibilitate")).toHaveValue("unavailable");

      await page.goto("/admin/products");
      const productRow = page.getByRole("row").filter({ hasText: productName });
      await expect(productRow).toContainText("Arhivat");
      await expect(productRow).toContainText("149,90");
    } finally {
      await cleanup(adminEmail, adminPassword, productSlug, categorySlug, collectionSlug);
    }
  });
});

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Parolă").fill(password);
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function cleanup(email: string, password: string, productSlug: string, categorySlug: string, collectionSlug: string) {
  if (!hasAdmin) return;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) throw new Error("Curățarea catalogului E2E nu s-a putut autentifica.");

  const results = await Promise.all([
    supabase.from("products").delete().eq("slug", productSlug),
    supabase.from("categories").delete().eq("slug", categorySlug),
    supabase.from("collections").delete().eq("slug", collectionSlug),
  ]);
  if (results.some((result) => result.error)) throw new Error("Datele catalogului E2E nu au putut fi curățate.");
  await supabase.auth.signOut({ scope: "local" });
}
