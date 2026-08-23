import type { CheckoutAddress } from "./types";

export type CheckoutFields = {
  email: string;
  phone: string;
  customerType: "individual" | "company" | "";
  companyName: string;
  companyTaxId: string;
  companyRegistrationNumber: string;
  shippingAddress: CheckoutAddress;
  billingSameAsShipping: boolean;
  billingAddress: CheckoutAddress;
  shippingMethodId: string;
  paymentMethod: "cash_on_delivery" | "";
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readCheckoutFields(formData: FormData): CheckoutFields {
  const shippingAddress = readAddress(formData, "shipping");
  const billingSameAsShipping = formData.get("billingSameAsShipping") === "on";
  return {
    email: field(formData, "email").toLowerCase(),
    phone: field(formData, "phone"),
    customerType:
      field(formData, "customerType") === "individual"
        ? "individual"
        : field(formData, "customerType") === "company"
          ? "company"
          : "",
    companyName: field(formData, "companyName"),
    companyTaxId: field(formData, "companyTaxId"),
    companyRegistrationNumber: field(formData, "companyRegistrationNumber"),
    shippingAddress,
    billingSameAsShipping,
    billingAddress: billingSameAsShipping
      ? shippingAddress
      : readAddress(formData, "billing"),
    shippingMethodId: field(formData, "shippingMethodId"),
    paymentMethod:
      field(formData, "paymentMethod") === "cash_on_delivery"
        ? "cash_on_delivery"
        : "",
  };
}

export function validateCheckoutFields(fields: CheckoutFields) {
  const errors: Record<string, string> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email) || fields.email.length > 254) {
    errors.email = "Introdu o adresă de e-mail validă.";
  }
  if (!fields.phone || fields.phone.length > 30) {
    errors.phone = "Introdu un număr de telefon valid.";
  }
  if (!fields.customerType) errors.customerType = "Alege tipul de client.";
  if (fields.customerType === "company") {
    if (!fields.companyName || fields.companyName.length > 200) {
      errors.companyName = "Denumirea firmei este obligatorie.";
    }
    if (!fields.companyTaxId || fields.companyTaxId.length > 50) {
      errors.companyTaxId = "CUI/CIF este obligatoriu.";
    }
    if (fields.companyRegistrationNumber.length > 80) {
      errors.companyRegistrationNumber = "Numărul de înregistrare este prea lung.";
    }
  }
  validateAddress(fields.shippingAddress, "shipping", errors);
  if (!fields.billingSameAsShipping) {
    validateAddress(fields.billingAddress, "billing", errors);
  }
  if (!UUID_PATTERN.test(fields.shippingMethodId)) {
    errors.shippingMethodId = "Alege o metodă de livrare disponibilă.";
  }
  if (!fields.paymentMethod) {
    errors.paymentMethod = "Alege metoda de plată disponibilă.";
  }
  return errors;
}

function readAddress(formData: FormData, prefix: "shipping" | "billing") {
  return {
    recipientName: field(formData, `${prefix}RecipientName`),
    phone: field(formData, `${prefix}Phone`),
    addressLine1: field(formData, `${prefix}AddressLine1`),
    addressLine2: field(formData, `${prefix}AddressLine2`),
    city: field(formData, `${prefix}City`),
    county: field(formData, `${prefix}County`),
    postalCode: field(formData, `${prefix}PostalCode`),
    countryCode: field(formData, `${prefix}CountryCode`).toUpperCase(),
  };
}

function validateAddress(
  address: CheckoutAddress,
  prefix: "shipping" | "billing",
  errors: Record<string, string>,
) {
  if (!address.recipientName || address.recipientName.length > 150) {
    errors[`${prefix}RecipientName`] = "Numele destinatarului este obligatoriu.";
  }
  if (!address.phone || address.phone.length > 30) {
    errors[`${prefix}Phone`] = "Telefonul este obligatoriu.";
  }
  if (!address.addressLine1 || address.addressLine1.length > 200) {
    errors[`${prefix}AddressLine1`] = "Adresa este obligatorie.";
  }
  if (!address.city || address.city.length > 100) {
    errors[`${prefix}City`] = "Localitatea este obligatorie.";
  }
  if (!address.county || address.county.length > 100) {
    errors[`${prefix}County`] = "Județul este obligatoriu.";
  }
  if (address.addressLine2.length > 200) {
    errors[`${prefix}AddressLine2`] = "Detaliile adresei sunt prea lungi.";
  }
  if (address.postalCode.length > 20) {
    errors[`${prefix}PostalCode`] = "Codul poștal este prea lung.";
  }
  if (address.countryCode !== "RO") {
    errors[`${prefix}CountryCode`] = "În MVP livrarea este disponibilă doar în România.";
  }
}

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}
