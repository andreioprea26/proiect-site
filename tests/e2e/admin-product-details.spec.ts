import { expect, test, type Locator, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import {
  readCustomizationFields,
  readVariantFields,
  validateAdjustment,
  validateCustomizationFields,
  validateImageFile,
  validateVariantFields,
} from "../../src/lib/admin/product-details-validation";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const hasAdmin = Boolean(adminEmail && adminPassword && supabaseUrl && supabaseKey);

test("atributele variantei resping chei duplicate și perechi incomplete", () => {
  const formData = new FormData();
  formData.set("title", "Varianta M");
  formData.set("displayOrder", "0");
  formData.append("attributeKey", "size");
  formData.append("attributeValue", "M");
  formData.append("attributeKey", "SIZE");
  formData.append("attributeValue", "L");

  const fields = readVariantFields(formData);
  expect(validateVariantFields(formData, fields).attributes).toBeTruthy();

  formData.delete("attributeValue");
  formData.append("attributeValue", "M");
  expect(validateVariantFields(formData, readVariantFields(formData)).attributes).toBeTruthy();
});

test("configurațiile personalizărilor sunt validate după tip", () => {
  const selection = customizationForm("selection");
  selection.set("selectionValues", "roșu\nRoșu");
  expect(validateCustomizationFields(selection, readCustomizationFields(selection)).configuration).toBeTruthy();

  const text = customizationForm("text");
  text.set("minLength", "20");
  text.set("maxLength", "10");
  expect(validateCustomizationFields(text, readCustomizationFields(text)).configuration).toBeTruthy();

  expect(validateAdjustment("0", "").delta).toBeTruthy();
  expect(validateAdjustment("-2", "Corecție")).toEqual({});
});

test("upload-ul respinge tipuri, extensii și dimensiuni nepermise", () => {
  expect(validateImageFile(new File(["svg"], "imagine.svg", { type: "image/svg+xml" }))).toBeTruthy();
  expect(validateImageFile(new File(["png"], "imagine.jpg", { type: "image/png" }))).toBeTruthy();
  expect(validateImageFile(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "imagine.png", { type: "image/png" }))).toBeTruthy();
  expect(validateImageFile(new File(["png"], "imagine.png", { type: "image/png" }))).toBeNull();
});

test.describe("detalii produs admin", () => {
  test.skip(!hasAdmin, "Necesită E2E_ADMIN_EMAIL și E2E_ADMIN_PASSWORD în .env.local.");
  test.describe.configure({ mode: "serial" });

  test("admin gestionează variante, personalizări, imagini și inventar auditat", async ({ page }) => {
    test.setTimeout(120_000);
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const productName = `Detalii E2E ${runId}`;
    const productSlug = `detalii-e2e-${runId}`;
    const variantA = `Varianta A ${runId}`;
    const variantAUpdated = `Varianta A editată ${runId}`;
    const variantB = `Varianta B ${runId}`;
    const customizationName = `Culoare ${runId}`;
    const imageA = `Imagine A ${runId}`;
    const imageB = `Imagine B ${runId}`;

    try {
      await login(page);
      await page.goto("/admin/products/new");
      await page.getByLabel("Nume").fill(productName);
      await page.getByLabel("Slug").fill(productSlug);
      await page.getByLabel("Preț de bază (RON)").fill("50");
      await page.getByLabel("Tip produs").selectOption("unique");
      await page.getByLabel("Disponibilitate").selectOption("unique");
      await page.getByLabel("Status publicare").selectOption("draft");
      await page.getByRole("button", { name: "Creează produsul" }).click();
      await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]+\?created=1$/);

      const variantSection = page.locator("#variante");
      await fillNewVariant(variantSection, variantA, "A", 0);
      await expect(variantSection.getByText("Varianta a fost creată.")).toBeVisible();
      const variantArticleA = articleWithInputValue(variantSection, variantA);
      await expect(variantArticleA).toBeVisible();
      await variantArticleA.getByLabel("Titlu").fill(variantAUpdated);
      await variantArticleA.getByRole("button", { name: "Salvează varianta" }).click();
      await expect(variantSection.getByText("Varianta a fost actualizată.")).toBeVisible();

      await fillNewVariant(variantSection, variantB, "B", 1);
      await expect(articleWithInputValue(variantSection, variantB)).toBeVisible();

      const customizationSection = page.locator("#personalizari");
      const customizationFormLocator = customizationSection.getByRole("heading", { name: "Opțiune nouă" }).locator("..").locator("form");
      await customizationFormLocator.getByLabel("Nume").fill(customizationName);
      await customizationFormLocator.getByLabel("Tip").selectOption("selection");
      await customizationFormLocator.getByLabel("Cost suplimentar (RON)").fill("5.50");
      await customizationFormLocator.getByLabel("Valori permise, câte una pe linie").fill("Roșu\nVerde");
      await customizationFormLocator.getByLabel("Obligatorie").check();
      await customizationFormLocator.getByRole("button", { name: "Adaugă opțiunea" }).click();
      await expect(customizationSection.getByText("Opțiunea de personalizare a fost creată.")).toBeVisible();
      const customizationArticle = articleWithInputValue(customizationSection, customizationName);
      await customizationArticle.getByLabel("Descriere").fill("Alege culoarea dorită");
      await customizationArticle.getByRole("button", { name: "Salvează opțiunea" }).click();
      await expect(customizationArticle.getByText("Opțiunea de personalizare a fost actualizată.")).toBeVisible();

      const imageSection = page.locator("#imagini");
      await uploadImage(imageSection, imageA);
      await expect(imageSection.locator("img")).toHaveCount(1);
      await uploadImage(imageSection, imageB);
      await expect(imageSection.locator("img")).toHaveCount(2);

      const imageBArticle = imageSection.locator(`img[alt="${imageB}"]`).locator("xpath=ancestor::article[1]");
      await imageBArticle.getByRole("button", { name: "Mută sus" }).click();
      await expect(imageSection.locator("article").first().locator("img")).toHaveAttribute("alt", imageB);

      const imageAArticle = imageSection.locator(`img[alt="${imageA}"]`).locator("xpath=ancestor::article[1]");
      page.once("dialog", (dialog) => dialog.accept());
      await imageAArticle.getByRole("button", { name: "Șterge" }).click();
      await expect(imageSection.locator(`img[alt="${imageA}"]`)).toHaveCount(0);

      const inventorySection = page.locator("#inventar");
      let inventoryA = inventorySection.getByRole("heading", { name: variantAUpdated }).locator("xpath=ancestor::article[1]");
      await inventoryA.getByRole("button", { name: "Inițializează inventarul" }).click();
      inventoryA = inventorySection.getByRole("heading", { name: variantAUpdated }).locator("xpath=ancestor::article[1]");
      await expect(inventoryA.getByText("0 buc.")).toBeVisible();
      await inventoryA.getByLabel("Ajustare (+/-)").fill("1");
      await inventoryA.getByLabel("Motiv opțional").fill("Stoc inițial E2E");
      await inventoryA.getByRole("button", { name: "Ajustează stocul" }).click();
      await expect(inventoryA.getByText("1 buc.")).toBeVisible();
      await expect(inventorySection.getByText("Stoc inițial E2E")).toBeVisible();

      await inventoryA.getByLabel("Ajustare (+/-)").fill("-2");
      await inventoryA.getByRole("button", { name: "Ajustează stocul" }).click();
      await expect(inventoryA.getByText("Ajustarea ar produce stoc negativ și a fost refuzată.")).toBeVisible();

      let inventoryB = inventorySection.getByRole("heading", { name: variantB }).locator("xpath=ancestor::article[1]");
      await inventoryB.getByRole("button", { name: "Inițializează inventarul" }).click();
      inventoryB = inventorySection.getByRole("heading", { name: variantB }).locator("xpath=ancestor::article[1]");
      await expect(inventoryB.getByText("0 buc.")).toBeVisible();
      await inventoryB.getByLabel("Ajustare (+/-)").fill("1");
      await inventoryB.getByRole("button", { name: "Ajustează stocul" }).click();
      await expect(inventoryB.getByText("Un produs unicat nu poate avea stoc total mai mare de 1.")).toBeVisible();
    } finally {
      await cleanup(productSlug);
    }
  });
});

function customizationForm(type: string) {
  const formData = new FormData();
  formData.set("name", "Opțiune test");
  formData.set("optionType", type);
  formData.set("additionalCost", "0");
  formData.set("displayOrder", "0");
  return formData;
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(adminEmail);
  await page.getByLabel("Parolă").fill(adminPassword);
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page).toHaveURL(/\/$/);
}

function articleWithInputValue(section: Locator, value: string) {
  return section.locator(`input[value="${value}"]`).locator("xpath=ancestor::article[1]");
}

async function fillNewVariant(section: Locator, title: string, attributeValue: string, order: number) {
  const form = section.getByRole("heading", { name: "Variantă nouă" }).locator("..").locator("form");
  await form.getByLabel("Titlu").fill(title);
  await form.getByLabel("Ordine").fill(String(order));
  await form.getByLabel("Cheie atribut 1").fill("model");
  await form.getByLabel("Valoare atribut 1").fill(attributeValue);
  await form.getByRole("button", { name: "Adaugă varianta" }).click();
}

async function uploadImage(section: Locator, altText: string) {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=", "base64");
  await section.getByLabel("Fișier imagine").setInputFiles({ name: `${altText}.png`, mimeType: "image/png", buffer: png });
  await section.getByLabel("Text alternativ").first().fill(altText);
  await section.getByRole("button", { name: "Încarcă imaginea" }).click();
  await expect(section.getByText("Imaginea a fost încărcată.")).toBeVisible();
}

async function cleanup(productSlug: string) {
  if (!hasAdmin) return;
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });
  const { error: loginError } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
  if (loginError) throw new Error("Curățarea E2E nu s-a putut autentifica.");
  const { data: product } = await supabase.from("products").select("id").eq("slug", productSlug).maybeSingle();
  if (product) {
    const { data: images } = await supabase.from("product_images").select("storage_path").eq("product_id", product.id);
    if (images && images.length > 0) await supabase.storage.from("product-images").remove(images.map((image) => image.storage_path));
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) throw new Error("Produsul E2E nu a putut fi curățat.");
  }
  await supabase.auth.signOut({ scope: "local" });
}
