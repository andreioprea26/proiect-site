export type CheckoutAddress = {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  county: string;
  postalCode: string;
  countryCode: string;
};

export type CheckoutPrefill = {
  authenticated: boolean;
  email: string;
  phone: string;
  customerName: string;
  addresses: Array<CheckoutAddress & { id: string; label: string }>;
};

export type ShippingMethod = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMinor: number;
};

export type CheckoutQuoteError = {
  key: string | null;
  code: string;
  message: string;
};

export type CheckoutQuoteLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  productType: string;
  availabilityStatus: string;
  variant: {
    id: string;
    title: string;
    attributes: Record<string, string>;
  } | null;
  customizations: Array<{
    id: string;
    name: string;
    optionType: string;
    value: string | boolean;
    additionalCostMinor: number;
  }>;
  quantity: number;
  basePriceMinor: number;
  customizationTotalMinor: number;
  unitPriceMinor: number;
  lineSubtotalMinor: number;
};

export type CheckoutQuote = {
  valid: boolean;
  lines: CheckoutQuoteLine[];
  errors: CheckoutQuoteError[];
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  currency: "RON";
  shippingMethod: ShippingMethod;
};

export type CheckoutActionState = {
  success: boolean;
  message: string | null;
  fieldErrors: Record<string, string>;
  quote: CheckoutQuote | null;
};
