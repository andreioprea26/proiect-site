import "server-only";

import { readRequiredServerEnvironmentVariable } from "@/lib/config/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildStripeCheckoutSessionParams,
  checkoutSessionExpiresAt,
  stripeSessionIdempotencyKey,
  type StripeOrderSnapshot,
} from "@/lib/stripe/checkout";
import { getStripeClient } from "@/lib/stripe/client";

import type { CardCheckoutResult } from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const cardMessages: Record<string, string> = {
  invalid_idempotency_key: "Reîncarcă pagina de checkout și încearcă din nou.",
  invalid_checkout: "Verifică datele de contact, livrare și facturare.",
  invalid_customer_type: "Tipul de client nu este valid.",
  invalid_billing_choice: "Opțiunea de facturare nu este validă.",
  invalid_company: "Datele companiei nu sunt valide.",
  invalid_user: "Sesiunea de autentificare nu mai este validă.",
  payment_method_unavailable: "Metoda de plată nu este disponibilă.",
  shipping_unavailable: "Metoda de livrare nu mai este disponibilă.",
  idempotency_conflict: "Această încercare a fost deja folosită cu alte date. Reîncarcă pagina.",
  cart_invalid: "Coșul s-a schimbat. Verifică produsele înainte de a continua.",
  insufficient_stock: "Cantitatea totală solicitată nu mai este disponibilă.",
  unique_stock_unavailable: "Produsul unicat nu mai este disponibil.",
};

export async function createCardCheckout(input: {
  idempotencyKey: string;
  lines: unknown;
  checkout: Record<string, unknown>;
}): Promise<CardCheckoutResult> {
  if (!UUID_PATTERN.test(input.idempotencyKey)) {
    return failure("invalid_idempotency_key");
  }

  try {
    const [sessionClient, admin] = await Promise.all([
      createClient(),
      Promise.resolve(createAdminClient()),
    ]);
    const { data: userData } = await sessionClient.auth.getUser();
    const { data: prepared, error: prepareError } = await admin.rpc(
      "prepare_card_order_server",
      {
        p_idempotency_key: input.idempotencyKey,
        p_lines: input.lines,
        p_checkout: input.checkout,
        p_user_id: userData.user?.id ?? null,
      },
    );

    if (prepareError || !isPreparedCardOrder(prepared)) {
      return failure("checkout_unavailable");
    }
    if (!prepared.success) {
      return failure(prepared.code);
    }

    const [orderResult, itemsResult, paymentResult] = await Promise.all([
      admin
        .from("orders")
        .select("id, confirmation_token, email, currency, subtotal_minor, shipping_minor, total_minor, shipping_method_name")
        .eq("id", prepared.orderId)
        .single(),
      admin
        .from("order_items")
        .select("product_name, unit_price_minor, quantity")
        .eq("order_id", prepared.orderId)
        .order("created_at"),
      admin
        .from("payments")
        .select("id, order_id, status, amount_minor, currency, provider_checkout_session_id")
        .eq("id", prepared.paymentId)
        .single(),
    ]);
    if (
      orderResult.error ||
      itemsResult.error ||
      paymentResult.error ||
      !orderResult.data ||
      !paymentResult.data
    ) {
      return failure("checkout_unavailable");
    }

    const order = toOrderSnapshot(orderResult.data, itemsResult.data ?? []);
    if (
      paymentResult.data.order_id !== order.id ||
      Number(paymentResult.data.amount_minor) !== order.totalMinor ||
      paymentResult.data.currency !== order.currency
    ) {
      return failure("checkout_reconciliation_failed");
    }

    const stripe = getStripeClient();
    const existingSessionId = paymentResult.data.provider_checkout_session_id;
    if (existingSessionId) {
      const existingSession = await stripe.checkout.sessions.retrieve(
        existingSessionId,
      );
      if (
        isReusableStripeSession(existingSession, order, prepared.paymentId)
      ) {
        return success(prepared, existingSession.url);
      }
      return failure("stripe_session_unavailable");
    }

    const expiresAt = checkoutSessionExpiresAt();
    const params = buildStripeCheckoutSessionParams({
      appUrl: readRequiredServerEnvironmentVariable("APP_URL"),
      paymentId: prepared.paymentId,
      expiresAt,
      order,
    });
    const stripeSession = await stripe.checkout.sessions.create(params, {
      idempotencyKey: stripeSessionIdempotencyKey(prepared.paymentId),
    });
    if (
      !stripeSession.id.startsWith("cs_test_") ||
      !isReusableStripeSession(stripeSession, order, prepared.paymentId)
    ) {
      await expireOrphanedSession(stripeSession.id);
      return failure("stripe_session_invalid");
    }

    const { data: attached, error: attachError } = await admin.rpc(
      "attach_stripe_checkout_session",
      {
        p_payment_id: prepared.paymentId,
        p_session_id: stripeSession.id,
        p_session_expires_at: new Date(stripeSession.expires_at * 1000).toISOString(),
      },
    );
    if (attachError || !isSuccessfulRpc(attached)) {
      await expireOrphanedSession(stripeSession.id);
      return failure("stripe_session_attach_failed");
    }

    return success(prepared, stripeSession.url);
  } catch (error) {
    console.error("Card checkout could not be started.", safeError(error));
    return failure("checkout_unavailable");
  }
}

function toOrderSnapshot(
  order: Record<string, unknown>,
  items: Array<Record<string, unknown>>,
): StripeOrderSnapshot {
  const snapshot: StripeOrderSnapshot = {
    id: String(order.id),
    confirmationToken: String(order.confirmation_token),
    email: String(order.email),
    currency: order.currency === "RON" ? "RON" : ("" as "RON"),
    subtotalMinor: Number(order.subtotal_minor),
    shippingMinor: Number(order.shipping_minor),
    totalMinor: Number(order.total_minor),
    shippingMethodName: String(order.shipping_method_name),
    items: items.map((item) => ({
      productName: String(item.product_name),
      unitPriceMinor: Number(item.unit_price_minor),
      quantity: Number(item.quantity),
    })),
  };
  if (
    !UUID_PATTERN.test(snapshot.id) ||
    !UUID_PATTERN.test(snapshot.confirmationToken) ||
    snapshot.currency !== "RON" ||
    !Number.isSafeInteger(snapshot.subtotalMinor) ||
    !Number.isSafeInteger(snapshot.shippingMinor) ||
    !Number.isSafeInteger(snapshot.totalMinor) ||
    snapshot.items.length === 0 ||
    snapshot.items.some(
      (item) =>
        !item.productName ||
        !Number.isSafeInteger(item.unitPriceMinor) ||
        item.unitPriceMinor < 0 ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1,
    )
  ) {
    throw new Error("Invalid internal order snapshot for Stripe Checkout.");
  }
  return snapshot;
}

function isReusableStripeSession(
  session: {
    status: string | null;
    url: string | null;
    mode: string;
    amount_total: number | null;
    currency: string | null;
    client_reference_id: string | null;
    metadata: Record<string, string> | null;
  },
  order: StripeOrderSnapshot,
  paymentId: string,
): session is typeof session & { url: string } {
  if (!session.url) return false;
  const url = new URL(session.url);
  return (
    session.status === "open" &&
    session.mode === "payment" &&
    session.amount_total === order.totalMinor &&
    session.currency?.toUpperCase() === order.currency &&
    session.client_reference_id === order.id &&
    session.metadata?.order_id === order.id &&
    session.metadata?.payment_id === paymentId &&
    url.protocol === "https:" &&
    (url.hostname === "checkout.stripe.com" ||
      url.hostname.endsWith(".checkout.stripe.com"))
  );
}

async function expireOrphanedSession(sessionId: string) {
  try {
    if (sessionId.startsWith("cs_test_")) {
      await getStripeClient().checkout.sessions.expire(sessionId);
    }
  } catch (error) {
    console.error("Stripe test Session could not be expired after DB failure.", safeError(error));
  }
}

function success(
  prepared: Extract<PreparedCardOrder, { success: true }>,
  redirectUrl: string,
): CardCheckoutResult {
  return {
    success: true,
    idempotentReplay: prepared.idempotentReplay,
    redirectUrl,
    confirmationToken: prepared.confirmationToken,
  };
}

function failure(code: string): CardCheckoutResult {
  return {
    success: false,
    code,
    message:
      cardMessages[code] ??
      "Plata cu cardul nu a putut fi inițiată momentan. Coșul și rezervarea au fost păstrate pentru retry sigur.",
  };
}

type PreparedCardOrder =
  | {
      success: true;
      idempotentReplay: boolean;
      orderId: string;
      paymentId: string;
      confirmationToken: string;
    }
  | { success: false; code: string };

function isPreparedCardOrder(value: unknown): value is PreparedCardOrder {
  if (!isRecord(value) || typeof value.success !== "boolean") return false;
  if (!value.success) return typeof value.code === "string";
  return (
    typeof value.idempotentReplay === "boolean" &&
    typeof value.orderId === "string" &&
    typeof value.paymentId === "string" &&
    typeof value.confirmationToken === "string"
  );
}

function isSuccessfulRpc(value: unknown) {
  return isRecord(value) && value.success === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeError(error: unknown) {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { message: "Unknown error" };
}
