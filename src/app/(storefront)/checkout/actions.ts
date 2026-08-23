"use server";

import {
  placeCodOrder,
  requestAuthoritativeQuote,
} from "@/lib/checkout/server";
import type { CheckoutActionState } from "@/lib/checkout/types";
import {
  readCheckoutFields,
  validateCheckoutFields,
} from "@/lib/checkout/validation";

const MAX_CART_PAYLOAD_LENGTH = 100_000;

export async function placeCheckoutOrder(
  _previousState: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const fields = readCheckoutFields(formData);
  const fieldErrors = validateCheckoutFields(fields);
  const rawCart = String(formData.get("cartPayload") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim();
  let cartLines: unknown = null;

  if (!rawCart || rawCart.length > MAX_CART_PAYLOAD_LENGTH) {
    fieldErrors.cart = "Coșul nu poate fi verificat. Reîncarcă pagina și încearcă din nou.";
  } else {
    try {
      cartLines = JSON.parse(rawCart) as unknown;
      if (!Array.isArray(cartLines) || cartLines.length === 0) {
        fieldErrors.cart = "Coșul este gol.";
      }
    } catch {
      fieldErrors.cart = "Coșul trimis pentru verificare nu este valid.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: "Verifică datele marcate în formular.",
      fieldErrors,
      quote: null,
      confirmationPath: null,
    };
  }

  const result = await placeCodOrder({
    idempotencyKey,
    lines: cartLines,
    checkout: {
      email: fields.email,
      phone: fields.phone,
      customerType: fields.customerType,
      companyName: fields.companyName,
      companyTaxId: fields.companyTaxId,
      companyRegistrationNumber: fields.companyRegistrationNumber,
      shippingAddress: fields.shippingAddress,
      billingSameAsShipping: fields.billingSameAsShipping,
      billingAddress: fields.billingAddress,
      shippingMethodId: fields.shippingMethodId,
      paymentMethod: fields.paymentMethod,
    },
  });
  if (!result.success) {
    const quote = await requestAuthoritativeQuote(
      cartLines,
      fields.shippingMethodId,
    );
    return {
      success: false,
      message: result.message,
      fieldErrors:
        result.code === "cart_invalid" ||
        result.code === "insufficient_stock" ||
        result.code === "unique_stock_unavailable"
          ? { cart: "Unele produse necesită atenție." }
          : {},
      quote,
      confirmationPath: null,
    };
  }

  return {
    success: true,
    message: result.idempotentReplay
      ? "Comanda era deja înregistrată. Deschidem confirmarea."
      : "Comanda a fost înregistrată. Deschidem confirmarea.",
    fieldErrors: {},
    quote: null,
    confirmationPath: `/order-confirmation/${result.confirmationToken}`,
  };
}
