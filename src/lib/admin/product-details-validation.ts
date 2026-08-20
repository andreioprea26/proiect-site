import {
  CUSTOMIZATION_TYPES,
  type CustomizationType,
} from "@/lib/admin/product-details";

const MONEY_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const ATTRIBUTE_KEY_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}_ -]*$/u;
const MAX_INTEGER = 2_147_483_647;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const IMAGE_TYPES = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
} as const;

export type DetailActionState = {
  fieldErrors: Record<string, string>;
  message: string | null;
  success: boolean;
};

export const EMPTY_DETAIL_STATE: DetailActionState = {
  fieldErrors: {},
  message: null,
  success: false,
};

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function isCustomizationType(candidate: string): candidate is CustomizationType {
  return CUSTOMIZATION_TYPES.some((type) => type === candidate);
}

function validateMoney(candidate: string, required: boolean) {
  if (!candidate && !required) return null;
  if (!MONEY_PATTERN.test(candidate)) return "Folosește un număr nenegativ cu maximum două zecimale.";
  const amount = Number(candidate);
  return amount <= 9_999_999_999.99 ? null : "Valoarea depășește limita permisă.";
}

function validateOrder(candidate: string) {
  const order = Number(candidate);
  return /^\d+$/.test(candidate) && Number.isInteger(order) && order <= MAX_INTEGER
    ? null
    : "Ordinea trebuie să fie un număr întreg nenegativ.";
}

export type VariantFields = {
  title: string;
  attributes: Record<string, string>;
  priceOverride: string;
  sku: string;
  isActive: boolean;
  displayOrder: string;
};

export function readVariantFields(formData: FormData): VariantFields {
  const keys = formData.getAll("attributeKey").map((item) => String(item).trim());
  const values = formData.getAll("attributeValue").map((item) => String(item).trim());
  const attributes: Record<string, string> = {};

  keys.forEach((key, index) => {
    if (key && values[index]) attributes[key] = values[index];
  });

  return {
    title: value(formData, "title"),
    attributes,
    priceOverride: value(formData, "priceOverride"),
    sku: value(formData, "sku"),
    isActive: formData.get("isActive") === "on",
    displayOrder: value(formData, "displayOrder"),
  };
}

export function validateVariantFields(formData: FormData, fields: VariantFields) {
  const errors: Record<string, string> = {};
  const keys = formData.getAll("attributeKey").map((item) => String(item).trim());
  const values = formData.getAll("attributeValue").map((item) => String(item).trim());

  if (!fields.title) errors.title = "Titlul este obligatoriu.";
  if (fields.title.length > 180) errors.title = "Titlul poate avea cel mult 180 de caractere.";
  if (fields.sku.length > 100) errors.sku = "SKU poate avea cel mult 100 de caractere.";
  const priceError = validateMoney(fields.priceOverride, false);
  if (priceError) errors.priceOverride = priceError;
  const orderError = validateOrder(fields.displayOrder);
  if (orderError) errors.displayOrder = orderError;

  if (keys.length === 0 || keys.length !== values.length || keys.length > 20) {
    errors.attributes = "Adaugă între 1 și 20 de atribute complete.";
  } else if (keys.some((key) => !key || key.length > 50 || !ATTRIBUTE_KEY_PATTERN.test(key))) {
    errors.attributes = "Cheile atributelor trebuie să aibă 1–50 de caractere și să conțină doar litere, cifre, spații, _ sau -.";
  } else if (values.some((item) => !item || item.length > 100)) {
    errors.attributes = "Fiecare valoare de atribut trebuie să aibă 1–100 de caractere.";
  } else if (new Set(keys.map((key) => key.toLocaleLowerCase("ro-RO"))).size !== keys.length) {
    errors.attributes = "Cheile atributelor nu se pot repeta.";
  }

  return errors;
}

export type CustomizationFields = {
  name: string;
  description: string;
  optionType: CustomizationType | "";
  isRequired: boolean;
  additionalCost: string;
  configuration: Record<string, unknown>;
  displayOrder: string;
  isActive: boolean;
};

export function readCustomizationFields(formData: FormData): CustomizationFields {
  const optionTypeValue = value(formData, "optionType");
  const optionType = isCustomizationType(optionTypeValue) ? optionTypeValue : "";
  let configuration: Record<string, unknown> = {};

  if (optionType === "selection") {
    const values = value(formData, "selectionValues")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    configuration = { values };
  } else if (optionType === "text") {
    configuration = {
      min_length: value(formData, "minLength") ? Number(value(formData, "minLength")) : 0,
      max_length: value(formData, "maxLength") ? Number(value(formData, "maxLength")) : null,
      multiline: formData.get("multiline") === "on",
    };
  } else if (optionType === "image") {
    const instructions = value(formData, "imageInstructions");
    configuration = instructions ? { instructions } : {};
  }

  return {
    name: value(formData, "name"),
    description: value(formData, "description"),
    optionType,
    isRequired: formData.get("isRequired") === "on",
    additionalCost: value(formData, "additionalCost"),
    configuration,
    displayOrder: value(formData, "displayOrder"),
    isActive: formData.get("isActive") === "on",
  };
}

export function validateCustomizationFields(formData: FormData, fields: CustomizationFields) {
  const errors: Record<string, string> = {};
  if (!fields.name) errors.name = "Numele este obligatoriu.";
  if (fields.name.length > 180) errors.name = "Numele poate avea cel mult 180 de caractere.";
  if (fields.description.length > 5_000) errors.description = "Descrierea poate avea cel mult 5.000 de caractere.";
  if (!fields.optionType) errors.optionType = "Selectează un tip valid.";
  const costError = validateMoney(fields.additionalCost, true);
  if (costError) errors.additionalCost = costError;
  const orderError = validateOrder(fields.displayOrder);
  if (orderError) errors.displayOrder = orderError;

  if (fields.optionType === "selection") {
    const values = (fields.configuration.values ?? []) as string[];
    if (values.length === 0 || values.length > 50) {
      errors.configuration = "Adaugă între 1 și 50 de valori permise.";
    } else if (values.some((item) => item.length > 100)) {
      errors.configuration = "Valorile permise pot avea cel mult 100 de caractere.";
    } else if (new Set(values.map((item) => item.toLocaleLowerCase("ro-RO"))).size !== values.length) {
      errors.configuration = "Valorile permise nu se pot repeta.";
    }
  }

  if (fields.optionType === "text") {
    const minRaw = value(formData, "minLength") || "0";
    const maxRaw = value(formData, "maxLength");
    const min = Number(minRaw);
    const max = maxRaw ? Number(maxRaw) : null;
    if (!/^\d+$/.test(minRaw) || min > 10_000 || (maxRaw && (!/^\d+$/.test(maxRaw) || Number(maxRaw) > 10_000))) {
      errors.configuration = "Lungimile trebuie să fie numere întregi între 0 și 10.000.";
    } else if (max !== null && min > max) {
      errors.configuration = "Lungimea minimă nu poate depăși lungimea maximă.";
    }
  }

  if (fields.optionType === "image") {
    const instructions = String(fields.configuration.instructions ?? "");
    if (instructions.length > 1_000) errors.configuration = "Instrucțiunile pot avea cel mult 1.000 de caractere.";
  }

  return errors;
}

export function validateImageFile(file: File) {
  if (file.size === 0) return "Selectează un fișier imagine.";
  if (file.size > MAX_FILE_SIZE) return "Imaginea poate avea maximum 5 MiB.";
  const extensions = IMAGE_TYPES[file.type as keyof typeof IMAGE_TYPES];
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!extensions || !(extensions as readonly string[]).includes(extension)) {
    return "Sunt acceptate numai JPEG, PNG, WebP și AVIF, cu extensia corectă.";
  }
  return null;
}

export function extensionForImageType(type: string) {
  return type === "image/jpeg" ? "jpg" : type.split("/")[1];
}

export function validateAltText(altText: string) {
  return altText.length <= 500 ? null : "Textul alternativ poate avea cel mult 500 de caractere.";
}

export function readInventoryFields(formData: FormData) {
  return {
    threshold: value(formData, "threshold"),
    delta: value(formData, "delta"),
    reason: value(formData, "reason"),
  };
}

export function validateThreshold(threshold: string) {
  if (!threshold) return null;
  const number = Number(threshold);
  return /^\d+$/.test(threshold) && Number.isInteger(number) && number <= MAX_INTEGER
    ? null
    : "Pragul trebuie să fie un număr întreg nenegativ.";
}

export function validateAdjustment(delta: string, reason: string) {
  const errors: Record<string, string> = {};
  const number = Number(delta);
  if (!/^-?\d+$/.test(delta) || !Number.isInteger(number) || number === 0 || number < -MAX_INTEGER - 1 || number > MAX_INTEGER) {
    errors.delta = "Ajustarea trebuie să fie un număr întreg diferit de zero.";
  }
  if (reason.length > 500) errors.reason = "Motivul poate avea cel mult 500 de caractere.";
  return errors;
}
