import "server-only";

import { getAppUrl, getEmailEnvironment } from "@/lib/config/env";
import { createAdminClient } from "@/lib/supabase/admin";

import { sendWithResend } from "./client";
import {
  prepareOperationalEmail,
  resendIdempotencyKey,
  sendOperationalEmail,
  type OperationalEmailSender,
} from "./delivery";
import {
  renderOperationalEmail,
  type EmailOrderSnapshot,
  type NotificationType,
} from "./templates";

export type NotificationDeliveryResult = {
  success: boolean;
  status: "sent" | "failed" | "skipped";
  notificationId?: string;
  providerMessageId?: string;
};

export async function deliverOrderNotification(input: {
  orderId: string;
  type: NotificationType;
  source: string;
  manualRequestId?: string;
  actorUserId?: string;
  sender?: OperationalEmailSender;
}): Promise<NotificationDeliveryResult> {
  const admin = createAdminClient();
  try {
    const { data: queued, error: queueError } = await admin.rpc("enqueue_order_notification", {
      p_order_id: input.orderId,
      p_notification_type: input.type,
      p_source: input.source,
    });
    if (queueError || !record(queued) || queued.success !== true || typeof queued.notificationId !== "string") {
      safeLog("Notification could not be queued.", input, queueError?.code);
      return { success: false, status: "failed" };
    }
    const notificationId = queued.notificationId;
    if (!input.manualRequestId && queued.status !== "pending") {
      return { success: true, status: "skipped", notificationId };
    }

    const requestId = input.manualRequestId ?? notificationId;
    const { data: claimed, error: claimError } = await admin.rpc("claim_notification_delivery", {
      p_notification_id: notificationId,
      p_request_id: requestId,
      p_actor_user_id: input.actorUserId ?? null,
    });
    if (claimError || !record(claimed) || claimed.success !== true) {
      safeLog("Notification attempt could not be claimed.", input, claimError?.code);
      return { success: false, status: "failed", notificationId };
    }
    if (claimed.claimed !== true || typeof claimed.attemptId !== "string") {
      return { success: true, status: "skipped", notificationId };
    }

    const attemptId = claimed.attemptId;
    const attemptNumber = Number(claimed.attemptNumber);
    try {
      const originalRecipient = String(claimed.recipient);
      const environment = getEmailEnvironment();
      const snapshot = await loadEmailSnapshot(admin, input.orderId);
      const message = renderOperationalEmail(input.type, snapshot);
      const payload = prepareOperationalEmail({
        mode: environment.mode,
        originalRecipient,
        testRecipient: environment.testRecipient,
        from: environment.from,
        replyTo: environment.replyTo,
        message,
      });
      const result = await sendOperationalEmail(input.sender ?? sendWithResend, payload, {
        apiKey: environment.apiKey,
        idempotencyKey: resendIdempotencyKey(notificationId, attemptNumber),
      });
      await finishAttempt(admin, attemptId, true, result.id, null);
      return {
        success: true,
        status: "sent",
        notificationId,
        providerMessageId: result.id,
      };
    } catch (error) {
      const safeError = safeDeliveryError(error);
      await finishAttempt(admin, attemptId, false, null, safeError);
      safeLog("Operational email delivery failed.", input, safeError);
      return { success: false, status: "failed", notificationId };
    }
  } catch (error) {
    safeLog("Notification infrastructure is unavailable.", input, safeDeliveryError(error));
    return { success: false, status: "failed" };
  }
}

async function loadEmailSnapshot(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
): Promise<EmailOrderSnapshot> {
  const [orderResult, itemsResult, shipmentResult] = await Promise.all([
    admin.from("orders").select("public_number, confirmation_token, shipping_address, shipping_method_name, payment_method, status, total_minor, currency").eq("id", orderId).single(),
    admin.from("order_items").select("product_name, quantity, line_subtotal_minor").eq("order_id", orderId).order("created_at"),
    admin.from("shipments").select("carrier, tracking_number, tracking_url").eq("order_id", orderId).maybeSingle(),
  ]);
  if (orderResult.error || itemsResult.error || shipmentResult.error || !orderResult.data) {
    throw new Error("email_snapshot_unavailable");
  }
  const order = orderResult.data;
  const address = record(order.shipping_address) ? order.shipping_address as Record<string, unknown> : {};
  const appUrl = new URL(getAppUrl());
  appUrl.pathname = `/order-confirmation/${order.confirmation_token}`;
  appUrl.search = "";
  appUrl.hash = "";
  return {
    publicNumber: order.public_number,
    confirmationUrl: appUrl.toString(),
    shippingMethodName: order.shipping_method_name,
    paymentMethod: order.payment_method,
    statusLabel: statusLabel(order.status),
    totalMinor: Number(order.total_minor),
    currency: order.currency,
    recipientName: stringValue(address.recipientName),
    city: stringValue(address.city),
    county: stringValue(address.county),
    items: (itemsResult.data ?? []).map((item) => ({
      productName: item.product_name,
      quantity: item.quantity,
      lineSubtotalMinor: Number(item.line_subtotal_minor),
    })),
    shipment: shipmentResult.data ? {
      carrier: shipmentResult.data.carrier,
      trackingNumber: shipmentResult.data.tracking_number,
      trackingUrl: shipmentResult.data.tracking_url,
    } : null,
  };
}

async function finishAttempt(
  admin: ReturnType<typeof createAdminClient>,
  attemptId: string,
  sent: boolean,
  providerMessageId: string | null,
  safeError: string | null,
) {
  const { data, error } = await admin.rpc("finish_notification_delivery", {
    p_attempt_id: attemptId,
    p_sent: sent,
    p_provider_message_id: providerMessageId,
    p_safe_error: safeError,
  });
  if (error || !record(data) || data.success !== true) {
    throw new Error("notification_completion_failed");
  }
}

function safeDeliveryError(error: unknown) {
  if (!(error instanceof Error)) return "unknown_delivery_error";
  const known = [
    "Missing required environment variable: RESEND_API_KEY",
    "Missing required environment variable: RESEND_FROM_EMAIL",
    "email_test_recipient_missing",
    "email_snapshot_unavailable",
    "notification_completion_failed",
    "resend_send_failed",
  ];
  return known.includes(error.message) ? error.message : error.name || "delivery_error";
}

function safeLog(message: string, input: { orderId: string; type: string; source: string }, code?: string) {
  console.error(message, {
    orderId: input.orderId,
    notificationType: input.type,
    source: input.source,
    code: code || "unknown",
  });
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    new: "Nouă", awaiting_payment: "Așteaptă plata", paid: "Plătită",
    awaiting_customization_review: "Personalizare în verificare", in_progress: "În lucru",
    ready: "Pregătită", shipped: "Expediată", completed: "Finalizată",
    cancelled: "Anulată", refunded: "Rambursată", returned: "Returnată",
  };
  return labels[value] ?? value;
}
