import { expect, test, type Page } from "@playwright/test";

import { CART_STORAGE_KEY, createCartLine, serializeCart } from "../../src/lib/cart/model";
import { cartLinesToCheckoutPayload } from "../../src/lib/checkout/payload";
import { readCheckoutFields, validateCheckoutFields } from "../../src/lib/checkout/validation";

const TEST_PRODUCT_ID = "53000000-0000-4000-8000-000000000001";
const TEST_UNIQUE_PRODUCT_ID = "53000000-0000-4000-8000-000000000002";
const e2eEmail = process.env.E2E_TEST_EMAIL ?? "";
const e2ePassword = process.env.E2E_TEST_PASSWORD ?? "";

function line({
  availabilityStatus = "in_stock",
  basePriceMinor = 9_999_999,
  productId = TEST_PRODUCT_ID,
  productType = "standard",
  quantity = 1,
  slug = "produs-cod-e2e",
}: {
  availabilityStatus?: "in_stock" | "unique";
  basePriceMinor?: number;
  productId?: string;
  productType?: "standard" | "unique";
  quantity?: number;
  slug?: string;
} = {}) {
  return createCartLine({
    productId,
    slug,
    name: "Nume neverificat din browser",
    productType,
    availabilityStatus,
    image: null,
    variant: null,
    customizations: [],
    basePriceMinor,
    quantity,
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

test("checkout-ul oferă plasarea reală a comenzii ramburs", async ({ page }) => {
  await seedCart(page);
  await page.goto("/checkout");

  await expect(page.getByRole("button", { name: "Plasează comanda ramburs" })).toBeEnabled();
  await expect(page.getByText(/înregistrată atomic/i)).toBeVisible();
});

test.describe.serial("plasarea COD cu fixture-uri Development", () => {
  test("checkout invalid nu creează comandă și păstrează coșul", async ({ page }) => {
    await seedCart(page);
    await page.goto("/checkout");
    await page.locator("form").evaluate((form) => ((form as HTMLFormElement).noValidate = true));
    await page.getByRole("button", { name: "Plasează comanda ramburs" }).click();

    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByText("Introdu o adresă de e-mail validă.")).toBeVisible();
    await expect.poll(() => storedCartCount(page)).toBe(1);
  });

  test("guest plasează COD cu preț și shipping recalculate, apoi coșul se golește", async ({ page }) => {
    await seedCart(page, line({ basePriceMinor: 1 }));
    await page.goto("/checkout");
    await fillCheckout(page, "guest-cod-e2e@example.com");
    await page.locator("form").evaluate((form) => {
      const tamperedShipping = document.createElement("input");
      tamperedShipping.name = "shippingMinor";
      tamperedShipping.value = "1";
      form.append(tamperedShipping);
    });
    await page.getByRole("button", { name: "Plasează comanda ramburs" }).click();

    await expect(page).toHaveURL(/\/order-confirmation\/[0-9a-f-]+$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Mulțumim pentru comandă!" })).toBeVisible();
    await expect(page.getByText("27,00 RON")).toBeVisible();
    await expect(page.getByText("Ramburs la livrare · neachitată")).toBeVisible();
    await expect(page.getByText("Curier COD E2E")).toBeVisible();
    await expect.poll(() => storedCartCount(page)).toBe(0);
  });

  test("dublu-submit converge la o singură confirmare", async ({ page }) => {
    await seedCart(page);
    await page.goto("/checkout");
    await fillCheckout(page, "double-submit-e2e@example.com");
    await page.locator("form").evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
      (form as HTMLFormElement).requestSubmit();
    });

    await expect(page).toHaveURL(/\/order-confirmation\/[0-9a-f-]+$/, { timeout: 30_000 });
    await expect(page.getByText("Comandă înregistrată")).toBeVisible();
    await expect.poll(() => storedCartCount(page)).toBe(0);
  });

  test("stoc insuficient refuză plasarea și păstrează coșul", async ({ page }) => {
    await seedCart(page, line({ quantity: 99 }));
    await page.goto("/checkout");
    await fillCheckout(page, "stock-e2e@example.com");
    await page.getByRole("button", { name: "Plasează comanda ramburs" }).click();

    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByTestId("checkout-result")).toBeVisible();
    await expect.poll(() => storedCartCount(page)).toBe(1);
  });

  test("produsul unicat poate fi comandat o singură dată", async ({ page }) => {
    await seedCart(page, line({
      availabilityStatus: "unique",
      basePriceMinor: 1,
      productId: TEST_UNIQUE_PRODUCT_ID,
      productType: "unique",
      slug: "unicat-cod-e2e",
    }));
    await page.goto("/checkout");
    await fillCheckout(page, "unique-e2e@example.com");
    await page.getByRole("button", { name: "Plasează comanda ramburs" }).click();

    await expect(page).toHaveURL(/\/order-confirmation\/[0-9a-f-]+$/, { timeout: 30_000 });
    await expect(page.getByText("57,00 RON")).toBeVisible();
  });
});

test("tokenul de confirmare necunoscut nu expune comenzi", async ({ page }) => {
  await page.goto("/order-confirmation/53000000-0000-4000-8000-000000000099");
  await expect(page.getByRole("heading", { name: "Pagina nu a fost găsită" })).toBeVisible();
  await expect(page.getByText(/Număr comandă/i)).toHaveCount(0);
});

test("customer autentificat primește prefill și plasează COD", async ({ page }) => {
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
  await page.getByLabel("Telefon", { exact: true }).fill("0712345678");
  await page.getByLabel("Nume destinatar").fill("Customer E2E");
  await page.getByLabel("Telefon destinatar").fill("0712345678");
  await page.getByLabel("Adresă", { exact: true }).fill("Strada Test 2");
  await page.getByLabel("Localitate").fill("București");
  await page.getByLabel("Județ").fill("București");
  await page.getByRole("button", { name: "Plasează comanda ramburs" }).click();
  await expect(page).toHaveURL(/\/order-confirmation\/[0-9a-f-]+$/, { timeout: 30_000 });
  await expect(page.getByText("Comandă înregistrată")).toBeVisible();
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

async function seedCart(page: Page, cartLine = line()) {
  const storedValue = serializeCart([cartLine]);
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: CART_STORAGE_KEY, value: storedValue },
  );
}

async function fillCheckout(page: Page, email: string) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Telefon", { exact: true }).fill("0712345678");
  await page.getByLabel("Nume destinatar").fill("Ana E2E");
  await page.getByLabel("Telefon destinatar").fill("0712345678");
  await page.getByLabel("Adresă", { exact: true }).fill("Strada Test 1");
  await page.getByLabel("Localitate").fill("București");
  await page.getByLabel("Județ").fill("București");
}

async function storedCartCount(page: Page) {
  return page.evaluate((key) => {
    const value = window.localStorage.getItem(key);
    if (!value) return 0;
    const parsed = JSON.parse(value) as { lines?: unknown[] };
    return parsed.lines?.length ?? 0;
  }, CART_STORAGE_KEY);
}
