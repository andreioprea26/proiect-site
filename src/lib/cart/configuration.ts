import type { CartCustomizationSelection, CartLine } from "./model";
import {
  createCartLine,
  maxQuantityForProduct,
  toMinorUnits,
} from "./model";

export type CartConfigurationValue = string | boolean;

export type CartProductConfiguration = {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  productType: CartLine["productType"];
  availabilityStatus: CartLine["availabilityStatus"];
  image: CartLine["image"];
  variants: Array<{
    id: string;
    title: string;
    attributes: Record<string, string>;
    effectivePrice: number;
  }>;
  customizations: Array<{
    id: string;
    name: string;
    optionType: CartCustomizationSelection["optionType"];
    isRequired: boolean;
    additionalCost: number;
    configuration: Record<string, unknown>;
  }>;
};

export type CartConfigurationErrors = {
  general?: string;
  variant?: string;
  quantity?: string;
  customizations: Record<string, string>;
};

export function configureCartLine(
  product: CartProductConfiguration,
  selectedVariantId: string,
  values: Record<string, CartConfigurationValue>,
  quantity: number,
): { line: CartLine | null; errors: CartConfigurationErrors } {
  const errors: CartConfigurationErrors = { customizations: {} };

  if (product.availabilityStatus === "unavailable") {
    errors.general = "Produsul este indisponibil și nu poate fi adăugat în coș.";
  }

  const selectedVariant = product.variants.find(
    (variant) => variant.id === selectedVariantId,
  );
  if (product.variants.length > 0 && !selectedVariant) {
    errors.variant = "Alege o variantă înainte de adăugarea în coș.";
  }

  const maxQuantity = maxQuantityForProduct(
    product.productType,
    product.availabilityStatus,
  );
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity) {
    errors.quantity = `Cantitatea trebuie să fie între 1 și ${maxQuantity}.`;
  }

  const selections: CartCustomizationSelection[] = [];
  for (const customization of product.customizations) {
    const value = values[customization.id];
    const error = validateCustomization(customization, value);
    if (error) {
      errors.customizations[customization.id] = error;
      continue;
    }

    const selection = customizationSelection(customization, value);
    if (selection) selections.push(selection);
  }

  const hasErrors = Boolean(
    errors.general ||
      errors.variant ||
      errors.quantity ||
      Object.keys(errors.customizations).length,
  );
  if (hasErrors) return { line: null, errors };

  const basePrice = selectedVariant?.effectivePrice ?? product.basePrice;
  return {
    line: createCartLine({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      productType: product.productType,
      availabilityStatus: product.availabilityStatus,
      image: product.image,
      variant: selectedVariant
        ? {
            id: selectedVariant.id,
            title: selectedVariant.title,
            attributes: selectedVariant.attributes,
          }
        : null,
      customizations: selections,
      basePriceMinor: toMinorUnits(basePrice),
      quantity,
    }),
    errors,
  };
}

function validateCustomization(
  customization: CartProductConfiguration["customizations"][number],
  value: CartConfigurationValue | undefined,
) {
  if (customization.optionType === "image" && customization.isRequired) {
    return "Această personalizare cere un upload privat, disponibil în fluxul de checkout.";
  }

  if (customization.optionType === "selection") {
    const allowedValues = stringValues(customization.configuration.values);
    const selected = typeof value === "string" ? value : "";
    if (!selected) {
      return customization.isRequired ? "Alege o opțiune." : null;
    }
    return allowedValues.includes(selected)
      ? null
      : "Opțiunea selectată nu este validă.";
  }

  if (customization.optionType === "text") {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) return customization.isRequired ? "Completează acest câmp." : null;
    const minLength = integerConfiguration(customization.configuration.min_length);
    const maxLength = integerConfiguration(customization.configuration.max_length);
    if (minLength !== null && text.length < minLength) {
      return `Textul trebuie să aibă cel puțin ${minLength} caractere.`;
    }
    if (maxLength !== null && text.length > maxLength) {
      return `Textul trebuie să aibă cel mult ${maxLength} caractere.`;
    }
    return null;
  }

  if (customization.optionType === "boolean") {
    return customization.isRequired && value !== true
      ? "Confirmă această opțiune obligatorie."
      : null;
  }

  return null;
}

function customizationSelection(
  customization: CartProductConfiguration["customizations"][number],
  value: CartConfigurationValue | undefined,
): CartCustomizationSelection | null {
  const isSelected =
    typeof value === "boolean" ? value : Boolean(value?.trim());
  if (!isSelected) return null;

  const normalizedValue =
    typeof value === "string" ? value.trim() : value === true;
  return {
    id: customization.id,
    name: customization.name,
    optionType: customization.optionType,
    value: normalizedValue,
    displayValue:
      typeof normalizedValue === "string"
        ? normalizedValue
        : customization.optionType === "image"
          ? "Imaginea va fi furnizată ulterior"
          : "Da",
    additionalCostMinor: toMinorUnits(customization.additionalCost),
  };
}

function stringValues(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function integerConfiguration(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}
