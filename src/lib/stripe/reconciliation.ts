import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { getStripeClient } from "./client";
import { readCheckoutSessionReference } from "./webhook";

export async function reconcileStaleStripeReservations(limit = 50) {
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 100));
  const admin = createAdminClient();
  const { data: candidates, error } = await admin.rpc(
    "list_stale_stripe_reservations",
    { p_limit: safeLimit },
  );
  if (error) throw new Error("Could not list stale Stripe reservations.");

  const stripe = getStripeClient();
  const results = [];
  for (const candidate of candidates ?? []) {
    const paymentId = String(candidate.payment_id);
    const sessionId = String(candidate.provider_checkout_session_id);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const reference = readCheckoutSessionReference(session);
    const { data, error: reconcileError } = await admin.rpc(
      "reconcile_stale_stripe_payment",
      {
        p_payment_id: paymentId,
        p_session_id: reference.sessionId,
        p_session_status: session.status,
        p_payment_status: reference.paymentStatus,
        p_payment_intent_id: reference.paymentIntentId,
        p_amount_total: reference.amountTotal,
        p_currency: reference.currency,
        p_mode: reference.mode,
      },
    );
    if (reconcileError || !isSuccessfulRpc(data)) {
      throw new Error(`Could not reconcile stale Stripe payment ${paymentId}.`);
    }
    results.push({ paymentId, sessionId, action: String(data.action) });
  }
  return results;
}

function isSuccessfulRpc(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    (value as Record<string, unknown>).success === true;
}
