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
  confirmationPath: string | null;
  redirectUrl: string | null;
  confirmationToken: string | null;
};

export type CardCheckoutResult =
  | {
      success: true;
      idempotentReplay: boolean;
      redirectUrl: string;
      confirmationToken: string;
    }
  | {
      success: false;
      code: string;
      message: string;
    };

export type CodOrderPlacementResult =
  | {
      success: true;
      idempotentReplay: boolean;
      orderId: string;
      publicNumber: string;
      confirmationToken: string;
      subtotalMinor: number;
      shippingMinor: number;
      totalMinor: number;
      currency: "RON";
    }
  | {
      success: false;
      code: string;
      message: string;
    };

export type OrderConfirmation = {
  publicNumber: string;
  totalMinor: number;
  currency: "RON";
  paymentMethod: "cash_on_delivery" | "card";
  paymentStatus: "unpaid" | "pending" | "paid" | "refunded";
  orderStatus: string;
  shippingMethodName: string;
  createdAt: string;
};
