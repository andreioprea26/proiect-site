import type Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeWebhookSecret } from "@/lib/stripe/client";
import {
  readCheckoutSessionReference,
  verifyStripeWebhookPayload,
} from "@/lib/stripe/webhook";

export const runtime = "nodejs";

const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.expired",
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
      (error.message.includes("Missing required environment variable") ||
        error.message.includes("must be a Stripe"));
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

  const session = event.data.object as Stripe.Checkout.Session;
  const reference = readCheckoutSessionReference(session);
  if (
    !UUID_PATTERN.test(reference.paymentId) ||
    !UUID_PATTERN.test(reference.orderId) ||
    reference.amountTotal === null ||
    !reference.currency
  ) {
    console.error("Stripe Checkout Session reference is incomplete.", {
      eventId: event.id,
      sessionId: reference.sessionId,
    });
    return Response.json(
      { received: false, error: "invalid_session_reference" },
      { status: 409 },
    );
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("process_stripe_checkout_event", {
      p_event_id: event.id,
      p_event_type: event.type,
      p_session_id: reference.sessionId,
      p_payment_intent_id: reference.paymentIntentId,
      p_payment_id: reference.paymentId,
      p_order_id: reference.orderId,
      p_amount_total: reference.amountTotal,
      p_currency: reference.currency,
      p_payment_status: reference.paymentStatus,
      p_mode: reference.mode,
    });
    if (error) {
      console.error("Stripe webhook database transaction failed.", {
        eventId: event.id,
        sessionId: reference.sessionId,
        code: error.code,
      });
      return Response.json(
        { received: false, error: "processing_failed" },
        { status: 500 },
      );
    }
    if (!isSuccessfulRpc(data)) {
      console.error("Stripe webhook reconciliation was rejected.", {
        eventId: event.id,
        sessionId: reference.sessionId,
        code: isRecord(data) ? data.code : "invalid_response",
      });
      return Response.json(
        { received: false, error: "reconciliation_failed" },
        { status: 409 },
      );
    }
    return Response.json({ received: true });
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

function isSuccessfulRpc(value: unknown) {
  return isRecord(value) && value.success === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
