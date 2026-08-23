export const CART_STORAGE_KEY = "handmade-store-cart-v1";
export const CART_STORAGE_VERSION = 1;
export const DEFAULT_MAX_QUANTITY = 99;

export type CartProductType =
  | "standard"
  | "unique"
  | "made_to_order"
  | "bundle";

export type CartAvailabilityStatus =
  | "in_stock"
  | "low_stock"
  | "made_to_order"
  | "unique"
  | "unavailable";

export type CartCustomizationSelection = {
  id: string;
  name: string;
  optionType: "selection" | "text" | "boolean" | "image";
  value: string | boolean;
  displayValue: string;
  additionalCostMinor: number;
};

export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  productType: CartProductType;
  availabilityStatus: CartAvailabilityStatus;
  image: { url: string; altText: string | null } | null;
  variant: {
    id: string;
    title: string;
    attributes: Record<string, string>;
  } | null;
  customizations: CartCustomizationSelection[];
  basePriceMinor: number;
  customizationTotalMinor: number;
  unitPriceMinor: number;
  quantity: number;
};

export type StoredCart = {
  version: typeof CART_STORAGE_VERSION;
  lines: CartLine[];
};

export type CreateCartLineInput = Omit<
  CartLine,
  "key" | "customizationTotalMinor" | "unitPriceMinor" | "quantity"
> & { quantity?: number };

const productTypes = new Set<CartProductType>([
  "standard",
  "unique",
  "made_to_order",
  "bundle",
]);
const availabilityStatuses = new Set<CartAvailabilityStatus>([
  "in_stock",
  "low_stock",
  "made_to_order",
  "unique",
  "unavailable",
]);
const customizationTypes = new Set<CartCustomizationSelection["optionType"]>([
  "selection",
  "text",
  "boolean",
  "image",
]);

export function toMinorUnits(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Valoarea monetară trebuie să fie un număr pozitiv valid.");
  }
  return Math.round((value + Number.EPSILON) * 100);
}

export function formatMoney(minorUnits: number) {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
  }).format(minorUnits / 100);
}

export function createCartLine(input: CreateCartLineInput): CartLine {
  const customizations = [...input.customizations]
    .map((customization) => ({
      ...customization,
      value:
        typeof customization.value === "string"
          ? customization.value.trim()
          : customization.value,
      displayValue: customization.displayValue.trim(),
    }))
    .sort((first, second) => first.id.localeCompare(second.id));
  const customizationTotalMinor = customizations.reduce(
    (total, customization) => total + customization.additionalCostMinor,
    0,
  );
  const quantity = normalizeQuantity(
    input.quantity ?? 1,
    maxQuantityForProduct(input.productType, input.availabilityStatus),
  );

  return {
    ...input,
    key: cartLineKey(input.productId, input.variant?.id ?? null, customizations),
    customizations,
    customizationTotalMinor,
    unitPriceMinor: input.basePriceMinor + customizationTotalMinor,
    quantity,
  };
}

export function cartLineKey(
  productId: string,
  variantId: string | null,
  customizations: CartCustomizationSelection[],
) {
  const identity = [...customizations]
    .sort((first, second) => first.id.localeCompare(second.id))
    .map(({ id, optionType, value }) => [
      id,
      optionType,
      typeof value === "string" ? value.trim() : value,
    ]);
  return JSON.stringify([productId, variantId, identity]);
}

export function addCartLine(lines: CartLine[], nextLine: CartLine) {
  const existing = lines.find((line) => line.key === nextLine.key);
  if (!existing) return [...lines, nextLine];

  const max = maxQuantityForLine(existing);
  return lines.map((line) =>
    line.key === nextLine.key
      ? {
          ...line,
          quantity: normalizeQuantity(
            line.quantity + nextLine.quantity,
            max,
          ),
        }
      : line,
  );
}

export function updateCartLineQuantity(
  lines: CartLine[],
  key: string,
  quantity: number,
) {
  return lines.map((line) =>
    line.key === key
      ? {
          ...line,
          quantity: normalizeQuantity(quantity, maxQuantityForLine(line)),
        }
      : line,
  );
}

export function maxQuantityForProduct(
  productType: CartProductType,
  availabilityStatus: CartAvailabilityStatus,
) {
  return productType === "unique" || availabilityStatus === "unique"
    ? 1
    : DEFAULT_MAX_QUANTITY;
}

export function maxQuantityForLine(line: CartLine) {
  return maxQuantityForProduct(line.productType, line.availabilityStatus);
}

export function normalizeQuantity(value: number, maximum = DEFAULT_MAX_QUANTITY) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(maximum, Math.max(1, Math.trunc(value)));
}

export function cartItemCount(lines: CartLine[]) {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

export function cartSubtotalMinor(lines: CartLine[]) {
  return lines.reduce(
    (total, line) => total + line.unitPriceMinor * line.quantity,
    0,
  );
}

export function serializeCart(lines: CartLine[]) {
  return JSON.stringify({ version: CART_STORAGE_VERSION, lines });
}

export function parseStoredCart(raw: string | null): CartLine[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== CART_STORAGE_VERSION) return [];
    if (!Array.isArray(parsed.lines)) return [];
    const lines = parsed.lines.filter(isCartLine);
    return lines.reduce<CartLine[]>((current, line) => addCartLine(current, line), []);
  } catch {
    return [];
  }
}

function isCartLine(value: unknown): value is CartLine {
  if (!isRecord(value)) return false;
  if (
    !nonEmptyString(value.key) ||
    !nonEmptyString(value.productId) ||
    !nonEmptyString(value.slug) ||
    !nonEmptyString(value.name) ||
    !productTypes.has(value.productType as CartProductType) ||
    !availabilityStatuses.has(
      value.availabilityStatus as CartAvailabilityStatus,
    ) ||
    !validMoney(value.basePriceMinor) ||
    !validMoney(value.customizationTotalMinor) ||
    !validMoney(value.unitPriceMinor) ||
    !Number.isInteger(value.quantity) ||
    (value.quantity as number) < 1 ||
    !Array.isArray(value.customizations)
  ) {
    return false;
  }

  const customizations = value.customizations.filter(isCustomization);
  if (customizations.length !== value.customizations.length) return false;
  const variant = value.variant;
  if (variant !== null && !isVariant(variant)) return false;
  const image = value.image;
  if (image !== null && !isImage(image)) return false;

  const typed = value as unknown as CartLine;
  if (typed.quantity > maxQuantityForLine(typed)) return false;
  if (
    typed.customizationTotalMinor !==
      customizations.reduce(
        (total, customization) => total + customization.additionalCostMinor,
        0,
      ) ||
    typed.unitPriceMinor !==
      typed.basePriceMinor + typed.customizationTotalMinor ||
    typed.key !==
      cartLineKey(typed.productId, typed.variant?.id ?? null, customizations)
  ) {
    return false;
  }
  return true;
}

function isCustomization(
  value: unknown,
): value is CartCustomizationSelection {
  return (
    isRecord(value) &&
    nonEmptyString(value.id) &&
    nonEmptyString(value.name) &&
    customizationTypes.has(
      value.optionType as CartCustomizationSelection["optionType"],
    ) &&
    (typeof value.value === "string" || typeof value.value === "boolean") &&
    nonEmptyString(value.displayValue) &&
    validMoney(value.additionalCostMinor)
  );
}

function isVariant(value: unknown) {
  return (
    isRecord(value) &&
    nonEmptyString(value.id) &&
    nonEmptyString(value.title) &&
    isRecord(value.attributes) &&
    Object.values(value.attributes).every((attribute) =>
      nonEmptyString(attribute),
    )
  );
}

function isImage(value: unknown) {
  return (
    isRecord(value) &&
    nonEmptyString(value.url) &&
    (value.altText === null || typeof value.altText === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validMoney(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}
