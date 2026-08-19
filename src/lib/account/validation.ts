export type ProfileFields = {
  firstName: string;
  lastName: string;
  phone: string;
};

export type ProfileField = keyof ProfileFields;

export type AddressFields = {
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  county: string;
  postalCode: string;
  countryCode: string;
  isDefault: boolean;
};

export type AddressField = keyof AddressFields;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalValue(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function validateMaximum(
  errors: Record<string, string>,
  field: string,
  value: string,
  maximum: number,
  message: string,
) {
  if (value.length > maximum) {
    errors[field] = message;
  }
}

export function readProfileFields(formData: FormData): ProfileFields {
  return {
    firstName: optionalValue(formData, "firstName"),
    lastName: optionalValue(formData, "lastName"),
    phone: optionalValue(formData, "phone"),
  };
}

export function validateProfileFields(
  fields: ProfileFields,
): Partial<Record<ProfileField, string>> {
  const errors: Partial<Record<ProfileField, string>> = {};

  validateMaximum(errors, "firstName", fields.firstName, 100, "Prenumele poate avea cel mult 100 de caractere.");
  validateMaximum(errors, "lastName", fields.lastName, 100, "Numele poate avea cel mult 100 de caractere.");
  validateMaximum(errors, "phone", fields.phone, 30, "Telefonul poate avea cel mult 30 de caractere.");

  return errors;
}

export function readAddressFields(formData: FormData): AddressFields {
  return {
    label: optionalValue(formData, "label"),
    recipientName: optionalValue(formData, "recipientName"),
    phone: optionalValue(formData, "phone"),
    addressLine1: optionalValue(formData, "addressLine1"),
    addressLine2: optionalValue(formData, "addressLine2"),
    city: optionalValue(formData, "city"),
    county: optionalValue(formData, "county"),
    postalCode: optionalValue(formData, "postalCode"),
    countryCode: optionalValue(formData, "countryCode").toUpperCase(),
    isDefault: formData.get("isDefault") === "on",
  };
}

export function validateAddressFields(
  fields: AddressFields,
): Partial<Record<AddressField, string>> {
  const errors: Partial<Record<AddressField, string>> = {};

  if (!fields.recipientName) errors.recipientName = "Numele destinatarului este obligatoriu.";
  if (!fields.phone) errors.phone = "Telefonul este obligatoriu.";
  if (!fields.addressLine1) errors.addressLine1 = "Adresa este obligatorie.";
  if (!fields.city) errors.city = "Localitatea este obligatorie.";
  if (!fields.county) errors.county = "Județul este obligatoriu.";
  if (!/^[A-Z]{2}$/.test(fields.countryCode)) {
    errors.countryCode = "Codul țării trebuie să conțină exact două litere.";
  }

  validateMaximum(errors, "label", fields.label, 80, "Eticheta poate avea cel mult 80 de caractere.");
  validateMaximum(errors, "recipientName", fields.recipientName, 150, "Numele destinatarului poate avea cel mult 150 de caractere.");
  validateMaximum(errors, "phone", fields.phone, 30, "Telefonul poate avea cel mult 30 de caractere.");
  validateMaximum(errors, "addressLine1", fields.addressLine1, 200, "Adresa poate avea cel mult 200 de caractere.");
  validateMaximum(errors, "addressLine2", fields.addressLine2, 200, "Detaliile adresei pot avea cel mult 200 de caractere.");
  validateMaximum(errors, "city", fields.city, 100, "Localitatea poate avea cel mult 100 de caractere.");
  validateMaximum(errors, "county", fields.county, 100, "Județul poate avea cel mult 100 de caractere.");
  validateMaximum(errors, "postalCode", fields.postalCode, 20, "Codul poștal poate avea cel mult 20 de caractere.");

  return errors;
}

export function isValidAddressId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function nullable(value: string): string | null {
  return value || null;
}
