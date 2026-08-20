import {
  AVAILABILITY_STATUSES,
  AvailabilityStatus,
  PRODUCT_TYPES,
  ProductType,
  PUBLICATION_STATUSES,
  PublicationStatus,
} from "@/lib/admin/catalog";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRICE_PATTERN = /^\d+(?:\.\d{1,2})?$/;

export type CatalogActionState = {
  fieldErrors: Record<string, string>;
  message: string | null;
  success: boolean;
};

export type TaxonomyFields = {
  name: string;
  slug: string;
  description: string;
};

export type ProductFields = {
  name: string;
  slug: string;
  description: string;
  basePrice: string;
  productType: ProductType | "";
  publicationStatus: PublicationStatus | "";
  availabilityStatus: AvailabilityStatus | "";
  isCustomizable: boolean;
  leadTimeDays: string;
  categoryIds: string[];
  collectionIds: string[];
};

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function uniqueValues(formData: FormData, name: string) {
  return [...new Set(formData.getAll(name).map((item) => String(item)))];
}

function isOneOf<T extends readonly string[]>(values: T, candidate: string): candidate is T[number] {
  return values.some((item) => item === candidate);
}

export function isValidUuid(candidate: string) {
  return UUID_PATTERN.test(candidate);
}

export function readTaxonomyFields(formData: FormData): TaxonomyFields {
  return {
    name: value(formData, "name"),
    slug: value(formData, "slug").toLowerCase(),
    description: value(formData, "description"),
  };
}

export function validateTaxonomyFields(fields: TaxonomyFields) {
  const errors: Record<string, string> = {};

  if (!fields.name) errors.name = "Numele este obligatoriu.";
  if (fields.name.length > 120) errors.name = "Numele poate avea cel mult 120 de caractere.";
  if (!SLUG_PATTERN.test(fields.slug)) {
    errors.slug = "Slug-ul folosește doar litere mici, cifre și cratime.";
  }
  if (fields.slug.length > 160) errors.slug = "Slug-ul poate avea cel mult 160 de caractere.";
  if (fields.description.length > 5_000) {
    errors.description = "Descrierea poate avea cel mult 5.000 de caractere.";
  }

  return errors;
}

export function readProductFields(formData: FormData): ProductFields {
  const productType = value(formData, "productType");
  const publicationStatus = value(formData, "publicationStatus");
  const availabilityStatus = value(formData, "availabilityStatus");

  return {
    name: value(formData, "name"),
    slug: value(formData, "slug").toLowerCase(),
    description: value(formData, "description"),
    basePrice: value(formData, "basePrice"),
    productType: isOneOf(PRODUCT_TYPES, productType) ? productType : "",
    publicationStatus: isOneOf(PUBLICATION_STATUSES, publicationStatus)
      ? publicationStatus
      : "",
    availabilityStatus: isOneOf(AVAILABILITY_STATUSES, availabilityStatus)
      ? availabilityStatus
      : "",
    isCustomizable: formData.get("isCustomizable") === "on",
    leadTimeDays: value(formData, "leadTimeDays"),
    categoryIds: uniqueValues(formData, "categoryIds"),
    collectionIds: uniqueValues(formData, "collectionIds"),
  };
}

export function validateProductFields(fields: ProductFields) {
  const errors: Record<string, string> = {};

  if (!fields.name) errors.name = "Numele este obligatoriu.";
  if (fields.name.length > 180) errors.name = "Numele poate avea cel mult 180 de caractere.";
  if (!SLUG_PATTERN.test(fields.slug)) {
    errors.slug = "Slug-ul folosește doar litere mici, cifre și cratime.";
  }
  if (fields.slug.length > 200) errors.slug = "Slug-ul poate avea cel mult 200 de caractere.";
  if (fields.description.length > 10_000) {
    errors.description = "Descrierea poate avea cel mult 10.000 de caractere.";
  }
  if (!PRICE_PATTERN.test(fields.basePrice)) {
    errors.basePrice = "Prețul trebuie să fie un număr nenegativ cu maximum două zecimale.";
  } else {
    const price = Number(fields.basePrice);
    if (!Number.isFinite(price) || price < 0 || price > 9_999_999_999.99) {
      errors.basePrice = "Prețul trebuie să fie între 0 și 9.999.999.999,99.";
    }
  }
  if (!fields.productType) errors.productType = "Selectează tipul produsului.";
  if (!fields.publicationStatus) errors.publicationStatus = "Selectează statusul de publicare.";
  if (!fields.availabilityStatus) errors.availabilityStatus = "Selectează disponibilitatea.";

  if (fields.leadTimeDays) {
    const days = Number(fields.leadTimeDays);
    if (!/^\d+$/.test(fields.leadTimeDays) || !Number.isInteger(days) || days < 1 || days > 32_767) {
      errors.leadTimeDays = "Termenul trebuie să fie un număr întreg între 1 și 32.767.";
    }
  }

  if (fields.categoryIds.some((id) => !isValidUuid(id))) {
    errors.categoryIds = "Selecția de categorii nu este validă.";
  }
  if (fields.collectionIds.some((id) => !isValidUuid(id))) {
    errors.collectionIds = "Selecția de colecții nu este validă.";
  }

  return errors;
}

export function nullable(value: string) {
  return value || null;
}

export const EMPTY_ACTION_STATE: CatalogActionState = {
  fieldErrors: {},
  message: null,
  success: false,
};
