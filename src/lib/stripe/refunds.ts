import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { getStripeClient } from "./client";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type FullRefundResult =
  | {
      success: true;
      idempotentReplay: boolean;
      refundId: string;
      providerRefundId: string;
      status: string | null;
    }
  | { success: false; code: string };

export async function createFullStripeRefund(input: {
  paymentId: string;
  actorUserId: string;
  reason?: string;
}): Promise<FullRefundResult> {
  if (
    !UUID_PATTERN.test(input.paymentId) ||
    !UUID_PATTERN.test(input.actorUserId) ||
    (input.reason !== undefined &&
      (input.reason.trim() !== input.reason ||
        input.reason.length === 0 ||
        input.reason.length > 500))
  ) {
    return { success: false, code: "invalid_refund" };
  }

  const admin = createAdminClient();
  const { data: prepared, error: prepareError } = await admin.rpc(
    "prepare_full_stripe_refund",
    {
      p_payment_id: input.paymentId,
      p_reason: input.reason ?? null,
      p_actor_user_id: input.actorUserId,
    },
  );
  if (prepareError || !isPreparedRefund(prepared) || !prepared.success) {
    return {
      success: false,
      code: isPreparedRefund(prepared) && !prepared.success
        ? prepared.code
        : "refund_unavailable",
    };
  }

  if (prepared.providerRefundId) {
    return {
      success: true,
      idempotentReplay: true,
      refundId: prepared.refundId,
      providerRefundId: prepared.providerRefundId,
      status: prepared.status,
    };
  }

  const stripe = getStripeClient();
  const refund = await stripe.refunds.create(
    {
      payment_intent: prepared.providerPaymentIntentId,
      metadata: {
        refund_id: prepared.refundId,
        payment_id: prepared.paymentId,
        order_id: prepared.orderId,
      },
    },
    { idempotencyKey: prepared.idempotencyKey },
  );

  const paymentIntentId = typeof refund.payment_intent === "string"
    ? refund.payment_intent
    : refund.payment_intent?.id ?? "";
  const metadata = refund.metadata ?? {};
  if (
    !refund.id.startsWith("re_") ||
    paymentIntentId !== prepared.providerPaymentIntentId ||
    refund.amount !== prepared.amountMinor ||
    refund.currency.toUpperCase() !== prepared.currency ||
    metadata.refund_id !== prepared.refundId ||
    metadata.payment_id !== prepared.paymentId ||
    metadata.order_id !== prepared.orderId
  ) {
    throw new Error("Stripe refund response failed internal reconciliation.");
  }

  const { data: attached, error: attachError } = await admin.rpc(
    "attach_stripe_refund",
    {
      p_refund_id: prepared.refundId,
      p_provider_refund_id: refund.id,
      p_provider_payment_intent_id: paymentIntentId,
      p_amount_minor: refund.amount,
      p_currency: refund.currency,
    },
  );
  if (attachError || !isSuccessfulRpc(attached)) {
    throw new Error("Stripe refund was created but could not be attached internally.");
  }

  return {
    success: true,
    idempotentReplay: prepared.idempotentReplay,
    refundId: prepared.refundId,
    providerRefundId: refund.id,
    status: refund.status,
  };
}

type PreparedRefund =
  | {
      success: true;
      idempotentReplay: boolean;
      refundId: string;
      paymentId: string;
      orderId: string;
      providerPaymentIntentId: string;
      amountMinor: number;
      currency: string;
      status: string;
      providerRefundId: string | null;
      idempotencyKey: string;
    }
  | { success: false; code: string };

function isPreparedRefund(value: unknown): value is PreparedRefund {
  if (!isRecord(value) || typeof value.success !== "boolean") return false;
  if (!value.success) return typeof value.code === "string";
  return (
    typeof value.idempotentReplay === "boolean" &&
    typeof value.refundId === "string" &&
    typeof value.paymentId === "string" &&
    typeof value.orderId === "string" &&
    typeof value.providerPaymentIntentId === "string" &&
    typeof value.amountMinor === "number" &&
    typeof value.currency === "string" &&
    typeof value.status === "string" &&
    (typeof value.providerRefundId === "string" || value.providerRefundId === null) &&
    typeof value.idempotencyKey === "string"
  );
}

function isSuccessfulRpc(value: unknown) {
  return isRecord(value) && value.success === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
