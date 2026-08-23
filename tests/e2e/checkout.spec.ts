import { expect, test, type Page } from "@playwright/test";

import { CART_STORAGE_KEY, createCartLine, serializeCart } from "../../src/lib/cart/model";
import { cartLinesToCheckoutPayload } from "../../src/lib/checkout/payload";
import { readCheckoutFields, validateCheckoutFields } from "../../src/lib/checkout/validation";

const TEST_PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const e2eEmail = process.env.E2E_TEST_EMAIL ?? "";
const e2ePassword = process.env.E2E_TEST_PASSWORD ?? "";

function line() {
  return createCartLine({
    productId: TEST_PRODUCT_ID,
    slug: "produs-test",
    name: "Nume neverificat din browser",
    productType: "standard",
    availabilityStatus: "in_stock",
    image: null,
    variant: null,
    customizations: [],
    basePriceMinor: 9_999_999,
    quantity: 1,
  });
}

test("payload-ul de checkout elimină prețurile și snapshot-urile browserului", () => {
  expect(cartLinesToCheckoutPayload([line()])).toEqual([
    {
      key: line().key,
      productId: TEST_PRODUCT_ID,
      variantId: null,
      quantity: 1,
      customizations: [],
    },
  ]);
});

test("validarea checkout-ului cere datele individuale și adresa din România", () => {
  const fields = readCheckoutFields(new FormData());
  const errors = validateCheckoutFields(fields);

  expect(errors).toMatchObject({
    email: expect.any(String),
    phone: expect.any(String),
    customerType: expect.any(String),
    shippingRecipientName: expect.any(String),
    shippingAddressLine1: expect.any(String),
    shippingMethodId: expect.any(String),
    paymentMethod: expect.any(String),
  });
});

test("compania cere denumire și CUI, iar facturarea diferită este validată", () => {
  const data = validFormData();
  data.set("customerType", "company");
  data.delete("billingSameAsShipping");
  const errors = validateCheckoutFields(readCheckoutFields(data));

  expect(errors.companyName).toBeTruthy();
  expect(errors.companyTaxId).toBeTruthy();
  expect(errors.billingRecipientName).toBeTruthy();
});

test("checkout-ul este disponibil vizitatorului fără autentificare obligatorie", async ({ page }) => {
  await seedCart(page);
  await page.goto("/checkout");

  await expect(page.getByRole("heading", { level: 1, name: "Date pentru comandă" })).toBeVisible();
  await expect(page.getByText("Poți continua ca vizitator")).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Ramburs la livrare")).toBeChecked();
  await expect(page.getByLabel(/Card online/)).toBeDisabled();
});

test("checkout-ul nu pretinde că plasează o comandă", async ({ page }) => {
  await seedCart(page);
  await page.goto("/checkout");

  await expect(page.getByText("Butonul verifică datele, dar nu plasează și nu încasează comanda.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Verifică datele și coșul" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Plasează comanda/i })).toHaveCount(0);
});

test("customer autentificat primește prefill din cont", async ({ page }) => {
  test.skip(!e2eEmail || !e2ePassword, "Necesită credențialele E2E customer.");
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(e2eEmail);
  await page.getByLabel("Parolă").fill(e2ePassword);
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await seedCart(page);
  await page.goto("/checkout");

  await expect(page.getByLabel("E-mail")).toHaveValue(e2eEmail);
  await expect(page.getByText("Poți continua ca vizitator")).toHaveCount(0);
});

test("checkout-ul este responsive fără overflow orizontal", async ({ page }) => {
  await seedCart(page);
  await page.goto("/checkout");

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole("heading", { name: "Date pentru comandă" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  }
});

function validFormData() {
  const data = new FormData();
  data.set("email", "client@example.com");
  data.set("phone", "0712345678");
  data.set("customerType", "individual");
  data.set("shippingRecipientName", "Ana Test");
  data.set("shippingPhone", "0712345678");
  data.set("shippingAddressLine1", "Strada Test 1");
  data.set("shippingCity", "București");
  data.set("shippingCounty", "București");
  data.set("shippingCountryCode", "RO");
  data.set("billingSameAsShipping", "on");
  data.set("shippingMethodId", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  data.set("paymentMethod", "cash_on_delivery");
  return data;
}

async function seedCart(page: Page) {
  const storedValue = serializeCart([line()]);
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: CART_STORAGE_KEY, value: storedValue },
  );
}
