"use server";

import { requestAuthoritativeQuote } from "@/lib/checkout/server";
import type { CheckoutActionState } from "@/lib/checkout/types";
import {
  readCheckoutFields,
  validateCheckoutFields,
} from "@/lib/checkout/validation";

const MAX_CART_PAYLOAD_LENGTH = 100_000;

export async function validateCheckout(
  _previousState: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const fields = readCheckoutFields(formData);
  const fieldErrors = validateCheckoutFields(fields);
  const rawCart = String(formData.get("cartPayload") ?? "");
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
    };
  }

  const quote = await requestAuthoritativeQuote(
    cartLines,
    fields.shippingMethodId,
  );
  if (!quote) {
    return {
      success: false,
      message:
        "Checkout-ul nu a putut fi verificat momentan. Încearcă din nou mai târziu.",
      fieldErrors: {},
      quote: null,
    };
  }

  if (!quote.valid) {
    return {
      success: false,
      message:
        "Coșul s-a schimbat între timp. Corectează elementele indicate înainte de a continua.",
      fieldErrors: { cart: "Unele produse necesită atenție." },
      quote,
    };
  }

  return {
    success: true,
    message:
      "Datele și coșul sunt valide. Comanda nu a fost creată; plasarea ei va fi adăugată în Blocul 5C.",
    fieldErrors: {},
    quote,
  };
}
