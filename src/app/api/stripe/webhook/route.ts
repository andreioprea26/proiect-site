import type Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe/client";
import {
  readCheckoutSessionReference,
  readRefundReference,
  verifyStripeWebhookPayload,
} from "@/lib/stripe/webhook";

export const runtime = "nodejs";

const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.expired",
  "refund.created",
  "refund.updated",
  "refund.failed",
]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ received: false, error: "missing_signature" }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = verifyStripeWebhookPayload(
      payload,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (error) {
    const configurationError =
      error instanceof Error &&
      (error.message ===
        "Missing required environment variable: STRIPE_WEBHOOK_SECRET" ||
        error.message ===
          "STRIPE_WEBHOOK_SECRET must be a Stripe webhook secret.");
    console.error(
      configurationError
        ? "Stripe webhook is not configured."
        : "Stripe webhook signature verification failed.",
    );
    return Response.json(
      {
        received: false,
        error: configurationError ? "webhook_not_configured" : "invalid_signature",
      },
      { status: configurationError ? 503 : 400 },
    );
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return Response.json({ received: true, ignored: true });
  }

  try {
    const admin = createAdminClient();
    const stripe = getStripeClient();
    const { data, error } = event.type.startsWith("checkout.session.")
      ? await processCheckoutEvent(event, stripe, admin)
      : await processRefundEvent(event, stripe, admin);
    if (error) {
      console.error("Stripe webhook database transaction failed.", {
        eventId: event.id,
        code: error.code,
      });
      return Response.json(
        { received: false, error: "processing_failed" },
        { status: 500 },
      );
    }
    if (!isSuccessfulRpc(data)) {
      console.error("Stripe webhook processing returned a retryable failure.", {
        eventId: event.id,
        code: isRecord(data) ? data.code : "invalid_response",
      });
      return Response.json(
        { received: false, error: "processing_failed" },
        { status: isRecord(data) && data.retryable === false ? 200 : 500 },
      );
    }
    return Response.json({
      received: true,
      classification: isRecord(data) ? data.classification : undefined,
    });
  } catch (error) {
    console.error("Stripe webhook could not access its server-side dependencies.", {
      eventId: event.id,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json(
      { received: false, error: "processing_unavailable" },
      { status: 500 },
    );
  }
}

async function processCheckoutEvent(
  event: Stripe.Event,
  stripe: Stripe,
  admin: ReturnType<typeof createAdminClient>,
) {
  const delivered = event.data.object as Stripe.Checkout.Session;
  const current = await stripe.checkout.sessions.retrieve(delivered.id);
  const reference = readCheckoutSessionReference(current);
  const effectiveType = current.status === "expired"
    ? "checkout.session.expired"
    : current.status === "complete" && current.payment_status === "paid"
      ? "checkout.session.completed"
      : event.type;

  return admin.rpc("process_stripe_checkout_event_hardened", {
    p_event_id: event.id,
    p_event_type: effectiveType,
    p_session_id: reference.sessionId,
    p_payment_intent_id: reference.paymentIntentId,
    p_payment_id: asUuidOrNull(reference.paymentId),
    p_order_id: asUuidOrNull(reference.orderId),
    p_amount_total: reference.amountTotal,
    p_currency: reference.currency,
    p_payment_status: reference.paymentStatus,
    p_mode: reference.mode,
    p_session_expires_at: reference.expiresAt,
  });
}

async function processRefundEvent(
  event: Stripe.Event,
  stripe: Stripe,
  admin: ReturnType<typeof createAdminClient>,
) {
  const delivered = event.data.object as Stripe.Refund;
  const current = await stripe.refunds.retrieve(delivered.id);
  const reference = readRefundReference(current);
  return admin.rpc("process_stripe_refund_event", {
    p_event_id: event.id,
    p_event_type: event.type,
    p_provider_refund_id: reference.refundId,
    p_provider_payment_intent_id: reference.paymentIntentId,
    p_refund_id: asUuidOrNull(reference.internalRefundId),
    p_payment_id: asUuidOrNull(reference.paymentId),
    p_order_id: asUuidOrNull(reference.orderId),
    p_amount_minor: reference.amountMinor,
    p_currency: reference.currency,
    p_refund_status: reference.status,
    p_failure_reason: reference.failureReason,
  });
}

function asUuidOrNull(value: string) {
  return UUID_PATTERN.test(value) ? value : null;
}

function isSuccessfulRpc(value: unknown) {
  return isRecord(value) && value.success === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
