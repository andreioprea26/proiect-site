import { expect, test, type Page } from "@playwright/test";

import {
  configureCartLine,
  type CartProductConfiguration,
} from "../../src/lib/cart/configuration";
import {
  addCartLine,
  cartItemCount,
  cartSubtotalMinor,
  CART_STORAGE_KEY,
  createCartLine,
  parseStoredCart,
  serializeCart,
  updateCartLineQuantity,
} from "../../src/lib/cart/model";

function product(
  overrides: Partial<CartProductConfiguration> = {},
): CartProductConfiguration {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "produs-test",
    name: "Produs test",
    basePrice: 20,
    productType: "standard",
    availabilityStatus: "in_stock",
    image: null,
    variants: [],
    customizations: [],
    ...overrides,
  };
}

function line(
  overrides: Partial<Parameters<typeof createCartLine>[0]> = {},
) {
  return createCartLine({
    productId: "11111111-1111-4111-8111-111111111111",
    slug: "produs-test",
    name: "Produs test",
    productType: "standard",
    availabilityStatus: "in_stock",
    image: null,
    variant: null,
    customizations: [],
    basePriceMinor: 2_000,
    quantity: 1,
    ...overrides,
  });
}

test("produsul simplu produce o linie validă pentru Add to Cart", () => {
  const result = configureCartLine(product(), "", {}, 2);

  expect(result.errors).toEqual({ customizations: {} });
  expect(result.line).toMatchObject({
    name: "Produs test",
    quantity: 2,
    unitPriceMinor: 2_000,
    variant: null,
  });
});

test("produsul cu variante cere o selecție validă și folosește price_override", () => {
  const configuredProduct = product({
    variants: [
      {
        id: "variant-red",
        title: "Roșu",
        attributes: { culoare: "roșu" },
        effectivePrice: 25.5,
      },
    ],
  });

  const missing = configureCartLine(configuredProduct, "", {}, 1);
  expect(missing.line).toBeNull();
  expect(missing.errors.variant).toContain("Alege o variantă");

  const selected = configureCartLine(
    configuredProduct,
    "variant-red",
    {},
    1,
  );
  expect(selected.line?.variant?.title).toBe("Roșu");
  expect(selected.line?.unitPriceMinor).toBe(2_550);
});

test("personalizările required și valorile selection sunt validate", () => {
  const configuredProduct = product({
    customizations: [
      {
        id: "color",
        name: "Culoare",
        optionType: "selection",
        isRequired: true,
        additionalCost: 3,
        configuration: { values: ["Roșu", "Verde"] },
      },
    ],
  });

  expect(
    configureCartLine(configuredProduct, "", {}, 1).errors.customizations.color,
  ).toBe("Alege o opțiune.");
  expect(
    configureCartLine(configuredProduct, "", { color: "Albastru" }, 1)
      .errors.customizations.color,
  ).toContain("nu este validă");

  const valid = configureCartLine(
    configuredProduct,
    "",
    { color: "Roșu" },
    1,
  );
  expect(valid.line?.unitPriceMinor).toBe(2_300);
});

test("personalizarea text respectă limitele, iar image required este blocată", () => {
  const textProduct = product({
    customizations: [
      {
        id: "message",
        name: "Mesaj",
        optionType: "text",
        isRequired: true,
        additionalCost: 0,
        configuration: { min_length: 3, max_length: 8 },
      },
    ],
  });
  expect(
    configureCartLine(textProduct, "", { message: "ab" }, 1).errors
      .customizations.message,
  ).toContain("cel puțin 3");
  expect(
    configureCartLine(textProduct, "", { message: "prea-lung" }, 1).errors
      .customizations.message,
  ).toContain("cel mult 8");
  expect(
    configureCartLine(textProduct, "", { message: "Cadou" }, 1).line,
  ).not.toBeNull();

  const imageProduct = product({
    customizations: [
      {
        id: "reference",
        name: "Referință",
        optionType: "image",
        isRequired: true,
        additionalCost: 5,
        configuration: {},
      },
    ],
  });
  const blocked = configureCartLine(
    imageProduct,
    "",
    { reference: true },
    1,
  );
  expect(blocked.line).toBeNull();
  expect(blocked.errors.customizations.reference).toContain("upload privat");
});

test("configurațiile diferite devin linii diferite", () => {
  const first = line({
    customizations: [
      {
        id: "message",
        name: "Mesaj",
        optionType: "text",
        value: "Ana",
        displayValue: "Ana",
        additionalCostMinor: 200,
      },
    ],
  });
  const second = line({
    customizations: [
      {
        id: "message",
        name: "Mesaj",
        optionType: "text",
        value: "Maria",
        displayValue: "Maria",
        additionalCostMinor: 200,
      },
    ],
  });

  expect(addCartLine([first], second)).toHaveLength(2);
  expect(first.key).not.toBe(second.key);
});

test("configurația identică se consolidează și calculele folosesc bani întregi", () => {
  const configuredLine = line({
    basePriceMinor: 1_999,
    quantity: 1,
    customizations: [
      {
        id: "gift",
        name: "Ambalaj",
        optionType: "boolean",
        value: true,
        displayValue: "Da",
        additionalCostMinor: 251,
      },
    ],
  });
  const lines = addCartLine([configuredLine], configuredLine);

  expect(lines).toHaveLength(1);
  expect(lines[0].quantity).toBe(2);
  expect(lines[0].unitPriceMinor).toBe(2_250);
  expect(cartSubtotalMinor(lines)).toBe(4_500);
  expect(cartItemCount(lines)).toBe(2);
});

test("cantitatea este limitată, inclusiv la 1 pentru produsul unicat", () => {
  const regular = updateCartLineQuantity([line()], line().key, 1_000);
  expect(regular[0].quantity).toBe(99);

  const unique = line({
    productType: "unique",
    availabilityStatus: "unique",
  });
  expect(updateCartLineQuantity([unique], unique.key, 2)[0].quantity).toBe(1);
});

test("produsul indisponibil nu poate fi adăugat", () => {
  const result = configureCartLine(
    product({ availabilityStatus: "unavailable" }),
    "",
    {},
    1,
  );
  expect(result.line).toBeNull();
  expect(result.errors.general).toContain("indisponibil");
});

test("storage modificat sau inconsistent este respins defensiv", () => {
  const validLine = line();
  const tampered = JSON.stringify({
    version: 1,
    lines: [{ ...validLine, unitPriceMinor: 1 }],
  });
  expect(parseStoredCart(tampered)).toEqual([]);
  expect(parseStoredCart("not-json")).toEqual([]);
});

test("pagina coșului persistă după reload și actualizează indicatorul", async ({
  page,
}) => {
  await seedCart(page, [line({ quantity: 2 })]);
  await page.goto("/cart");

  await expect(
    page.getByRole("heading", { level: 1, name: "Coș de cumpărături" }),
  ).toBeVisible();
  await expect(page.getByTestId("cart-line")).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Coș de cumpărături, 2 articole/ })).toBeVisible();
  await expect(page.getByTestId("cart-subtotal")).toContainText("40,00");

  await page.reload();
  await expect(page.getByTestId("cart-line")).toHaveCount(1);
  await expect(page.getByLabel("Cantitate pentru Produs test")).toHaveValue("2");
});

test("cantitatea poate fi crescută și scăzută din UI", async ({ page }) => {
  await seedCart(page, [line()]);
  await page.goto("/cart");

  await page.getByRole("button", { name: "Crește cantitatea pentru Produs test" }).click();
  await expect(page.getByLabel("Cantitate pentru Produs test")).toHaveValue("2");
  await expect(page.getByTestId("line-subtotal")).toContainText("40,00");
  await page.getByRole("button", { name: "Scade cantitatea pentru Produs test" }).click();
  await expect(page.getByLabel("Cantitate pentru Produs test")).toHaveValue("1");
});

test("produsul unicat nu permite creșterea cantității în UI", async ({ page }) => {
  await seedCart(page, [line({ productType: "unique", availabilityStatus: "unique" })]);
  await page.goto("/cart");

  await expect(
    page.getByRole("button", { name: "Crește cantitatea pentru Produs test" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Cantitate pentru Produs test")).toHaveAttribute("max", "1");
});

test("liniile pot fi eliminate și coșul poate fi golit", async ({ page }) => {
  const secondLine = line({
    productId: "22222222-2222-4222-8222-222222222222",
    slug: "produs-doi",
    name: "Produs doi",
  });
  await seedCart(page, [line(), secondLine]);
  await page.goto("/cart");

  await page.getByRole("button", { name: "Elimină Produs test din coș" }).click();
  await expect(page.getByTestId("cart-line")).toHaveCount(1);
  await page.getByRole("button", { name: "Golește coșul" }).click();
  await expect(page.getByRole("heading", { name: "Coșul este gol" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Coș de cumpărături, 0 articole/ })).toBeVisible();
});

test("coșul rămâne local la navigarea spre login și oferă legătura spre checkout", async ({
  page,
}) => {
  await seedCart(page, [line()]);
  await page.goto("/cart");
  await expect(
    page.getByRole("link", { name: "Continuă la checkout" }),
  ).toHaveAttribute("href", "/checkout");

  await page.goto("/login");
  await page.goto("/cart");
  await expect(page.getByTestId("cart-line")).toHaveCount(1);
});

test("pagina coșului este responsive fără overflow orizontal", async ({ page }) => {
  await seedCart(page, [line({ quantity: 2 })]);
  await page.goto("/cart");

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.getByTestId("cart-line")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);
  }
});

async function seedCart(
  page: Page,
  lines: ReturnType<typeof line>[],
) {
  const value = serializeCart(lines);
  await page.addInitScript(
    ({ key, storedValue }) => window.localStorage.setItem(key, storedValue),
    { key: CART_STORAGE_KEY, storedValue: value },
  );
}
