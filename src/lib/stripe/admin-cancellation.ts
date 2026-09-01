import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { getStripeClient } from "./client";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function cancelPendingStripeOrder(input: {
  paymentId: string;
  actorUserId: string;
  requestId: string;
  note?: string;
}) {
  if (![input.paymentId, input.actorUserId, input.requestId].every((value) => UUID_PATTERN.test(value))) {
    return { success: false as const, code: "invalid_request" };
  }

  const admin = createAdminClient();
  const { data: payment, error } = await admin
    .from("payments")
    .select("id, order_id, provider, status, provider_checkout_session_id")
    .eq("id", input.paymentId)
    .maybeSingle();
  if (error || !payment) return { success: false as const, code: "payment_not_found" };
  if (payment.provider !== "stripe" || !payment.provider_checkout_session_id) {
    return { success: false as const, code: "stripe_session_missing" };
  }
  if (["paid", "refunded"].includes(payment.status)) {
    return { success: false as const, code: "payment_completed_refund_required" };
  }

  const stripe = getStripeClient();
  let session = await stripe.checkout.sessions.retrieve(payment.provider_checkout_session_id);
  if (session.status === "open") {
    try {
      session = await stripe.checkout.sessions.expire(session.id);
    } catch {
      // A concurrent payment can complete between retrieve and expire. Fetch
      // the canonical Stripe state again and let 6C reconciliation decide.
      session = await stripe.checkout.sessions.retrieve(session.id);
    }
  }

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
  const { data, error: reconcileError } = await admin.rpc(
    "reconcile_admin_stripe_cancellation",
    {
      p_payment_id: payment.id,
      p_session_id: session.id,
      p_session_status: session.status,
      p_payment_status: session.payment_status,
      p_payment_intent_id: paymentIntentId,
      p_amount_total: session.amount_total,
      p_currency: session.currency,
      p_mode: session.mode,
      p_actor_user_id: input.actorUserId,
      p_request_id: input.requestId,
      p_note: input.note ?? null,
    },
  );
  if (reconcileError || !isRecord(data) || data.success !== true) {
    return {
      success: false as const,
      code: isRecord(data) && typeof data.code === "string"
        ? data.code
        : "stripe_cancellation_failed",
    };
  }
  return { success: true as const, idempotentReplay: data.idempotentReplay === true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
