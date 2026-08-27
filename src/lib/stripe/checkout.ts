import type Stripe from "stripe";

export const STRIPE_CHECKOUT_DURATION_SECONDS = 30 * 60;

export type StripeOrderSnapshot = {
  id: string;
  confirmationToken: string;
  email: string;
  currency: "RON";
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  shippingMethodName: string;
  items: Array<{
    productName: string;
    unitPriceMinor: number;
    quantity: number;
  }>;
};

export function buildStripeCheckoutSessionParams(input: {
  appUrl: string;
  paymentId: string;
  expiresAt: number;
  order: StripeOrderSnapshot;
}): Stripe.Checkout.SessionCreateParams {
  const appUrl = new URL(input.appUrl);
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    input.order.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: input.order.currency.toLowerCase(),
        unit_amount: item.unitPriceMinor,
        product_data: { name: item.productName },
      },
    }));

  if (input.order.shippingMinor > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: input.order.currency.toLowerCase(),
        unit_amount: input.order.shippingMinor,
        product_data: {
          name: `Livrare · ${input.order.shippingMethodName}`,
        },
      },
    });
  }

  const representedTotal = lineItems.reduce((total, line) => {
    const unitAmount = line.price_data?.unit_amount;
    return total + (typeof unitAmount === "number" ? unitAmount : 0) * (line.quantity ?? 1);
  }, 0);
  if (representedTotal !== input.order.totalMinor) {
    throw new Error("Stripe line items do not match the internal order total.");
  }

  return {
    mode: "payment",
    payment_method_types: ["card"],
    client_reference_id: input.order.id,
    customer_email: input.order.email,
    expires_at: input.expiresAt,
    line_items: lineItems,
    metadata: {
      order_id: input.order.id,
      payment_id: input.paymentId,
    },
    payment_intent_data: {
      metadata: {
        order_id: input.order.id,
        payment_id: input.paymentId,
      },
    },
    success_url: new URL(
      `/order-confirmation/${input.order.confirmationToken}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      appUrl,
    ).toString(),
    cancel_url: new URL("/checkout?payment=cancelled", appUrl).toString(),
  };
}

export function stripeSessionIdempotencyKey(paymentId: string) {
  return `checkout_session:${paymentId}`;
}

export function checkoutSessionExpiresAt(now = Date.now()) {
  return Math.floor(now / 1000) + STRIPE_CHECKOUT_DURATION_SECONDS;
}
