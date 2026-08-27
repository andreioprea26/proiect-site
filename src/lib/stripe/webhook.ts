import "server-only";

import type Stripe from "stripe";

import { getStripeClient } from "./client";

export function verifyStripeWebhookPayload(
  payload: string,
  signature: string,
  secret: string,
): Stripe.Event {
  return getStripeClient().webhooks.constructEvent(payload, signature, secret);
}

export function readCheckoutSessionReference(session: Stripe.Checkout.Session) {
  const paymentId = session.metadata?.payment_id ?? "";
  const orderId = session.metadata?.order_id ?? "";
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  return {
    sessionId: session.id,
    paymentIntentId,
    paymentId,
    orderId,
    amountTotal: session.amount_total,
    currency: session.currency,
    paymentStatus: session.payment_status,
    mode: session.mode,
  };
}
