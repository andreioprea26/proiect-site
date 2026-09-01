import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient;
let shippingId: string;
let productIds: string[];

test.describe.serial("Stripe DB concurrency cu fixture-uri izolate", () => {
  test.beforeAll(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new Error("Testele de concurență necesită Supabase Development server env.");
    }
    admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const ns = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    shippingId = crypto.randomUUID();
    productIds = Array.from({ length: 7 }, () => crypto.randomUUID());
    const products = productIds.map((id, index) => ({
      id,
      name: `Concurrency 6C ${ns} ${index}`,
      slug: `concurrency-6c-${ns}-${index}`,
      base_price: 10,
      product_type: index === 3 ? "unique" : "standard",
      publication_status: "published",
      availability_status: index === 3 ? "unique" : "in_stock",
      is_customizable: false,
    }));
    const { error: productError } = await admin.from("products").insert(products);
    if (productError) throw productError;
    const { error: inventoryError } = await admin.from("inventory").insert(
      productIds.map((product_id) => ({ product_id, quantity: 1 })),
    );
    if (inventoryError) throw inventoryError;
    const { error: shippingError } = await admin.from("shipping_methods").insert({
      id: shippingId,
      code: `concurrency-6c-${ns}`,
      name: `Concurrency 6C ${ns}`,
      price_minor: 500,
      is_active: true,
      display_order: 0,
    });
    if (shippingError) throw shippingError;
  });

  test.afterAll(async () => {
    if (!admin || !productIds?.length) return;
    const { data: items } = await admin.from("order_items")
      .select("order_id").in("product_id", productIds);
    const orderIds = [...new Set((items ?? []).map((item) => item.order_id))];
    if (orderIds.length) await admin.from("orders").delete().in("id", orderIds);
    await admin.from("products").delete().in("id", productIds);
    await admin.from("shipping_methods").delete().eq("id", shippingId);
  });

  test("card/card acceptă exact o rezervare pentru ultima unitate", async () => {
    const [a, b] = await Promise.all([
      prepareCard(productIds[0], crypto.randomUUID()),
      prepareCard(productIds[0], crypto.randomUUID()),
    ]);
    expect([a, b].filter(isRpcSuccess)).toHaveLength(1);
    const inventoryId = await getInventoryId(productIds[0]);
    const { count } = await admin.from("stock_reservations")
      .select("id", { count: "exact", head: true })
      .eq("inventory_id", inventoryId).eq("status", "active");
    expect(count).toBe(1);
  });

  test("card/COD respinge COD când cardul deține ultima unitate", async () => {
    expect(isRpcSuccess(await prepareCard(productIds[1], crypto.randomUUID()))).toBe(true);
    const { data, error } = await admin.rpc("place_cod_order", {
      p_idempotency_key: crypto.randomUUID(),
      p_lines: lines(productIds[1]),
      p_checkout: { ...checkout(), paymentMethod: "cash_on_delivery" },
    });
    expect(error).toBeNull();
    expect(isRpcSuccess(data)).toBe(false);
    const inventoryId = await getInventoryId(productIds[1]);
    const { data: inventory } = await admin.from("inventory")
      .select("quantity").eq("id", inventoryId).single();
    expect(inventory?.quantity).toBe(1);
  });

  test("produsul unicat nu poate primi două checkout-uri", async () => {
    const [a, b] = await Promise.all([
      prepareCard(productIds[3], crypto.randomUUID()),
      prepareCard(productIds[3], crypto.randomUUID()),
    ]);
    expect([a, b].filter(isRpcSuccess)).toHaveLength(1);
  });

  test("webhook-urile completed concurente consumă o singură dată", async () => {
    const fixture = await prepareAttachedCard(productIds[2]);
    const event = (eventId: string) => processCheckoutEvent(fixture, eventId, "completed");
    const eventA = `evt_e2e_${crypto.randomUUID().replaceAll("-", "")}`;
    const eventB = `evt_e2e_${crypto.randomUUID().replaceAll("-", "")}`;
    const [a, b] = await Promise.all([event(eventA), event(eventB)]);
    expect(a.error).toBeNull();
    expect(b.error).toBeNull();
    const inventoryId = await getInventoryId(productIds[2]);
    const { data: inventory } = await admin.from("inventory")
      .select("quantity").eq("id", inventoryId).single();
    expect(inventory?.quantity).toBe(0);
    const { count } = await admin.from("inventory_movements")
      .select("id", { count: "exact", head: true })
      .eq("context->>paymentId", fixture.paymentId);
    expect(count).toBe(1);
  });

  test("webhook-urile expired concurente eliberează o singură dată", async () => {
    const fixture = await prepareAttachedCard(productIds[4]);
    const eventId = `evt_e2e_${crypto.randomUUID().replaceAll("-", "")}`;
    const [a, b] = await Promise.all([
      processCheckoutEvent(fixture, eventId, "expired"),
      processCheckoutEvent(fixture, eventId, "expired"),
    ]);
    expect(a.error).toBeNull();
    expect(b.error).toBeNull();
    const { data: payment } = await admin.from("payments")
      .select("status").eq("id", fixture.paymentId).single();
    expect(payment?.status).toBe("expired");
    const { count } = await admin.from("stock_reservations")
      .select("id", { count: "exact", head: true })
      .eq("payment_id", fixture.paymentId).eq("status", "expired");
    expect(count).toBe(1);
    const inventoryId = await getInventoryId(productIds[4]);
    const { data: inventory } = await admin.from("inventory")
      .select("quantity").eq("id", inventoryId).single();
    expect(inventory?.quantity).toBe(1);
  });

  test("completed și expired concurente converg la o stare terminală coerentă", async () => {
    const fixture = await prepareAttachedCard(productIds[5]);
    const [completed, expired] = await Promise.all([
      processCheckoutEvent(
        fixture,
        `evt_e2e_${crypto.randomUUID().replaceAll("-", "")}`,
        "completed",
      ),
      processCheckoutEvent(
        fixture,
        `evt_e2e_${crypto.randomUUID().replaceAll("-", "")}`,
        "expired",
      ),
    ]);
    expect(completed.error).toBeNull();
    expect(expired.error).toBeNull();
    const { data: payment } = await admin.from("payments")
      .select("status").eq("id", fixture.paymentId).single();
    const inventoryId = await getInventoryId(productIds[5]);
    const { data: inventory } = await admin.from("inventory")
      .select("quantity").eq("id", inventoryId).single();
    const { count: movements } = await admin.from("inventory_movements")
      .select("id", { count: "exact", head: true })
      .eq("context->>paymentId", fixture.paymentId);
    if (payment?.status === "paid") {
      expect(inventory?.quantity).toBe(0);
      expect(movements).toBe(1);
    } else {
      expect(payment?.status).toBe("expired");
      expect(inventory?.quantity).toBe(1);
      expect(movements).toBe(0);
    }
  });

  test("două inițieri concurente de full refund converg la un singur record", async () => {
    const fixture = await prepareAttachedCard(productIds[6]);
    const paid = await processCheckoutEvent(
      fixture,
      `evt_e2e_${crypto.randomUUID().replaceAll("-", "")}`,
      "completed",
    );
    expect(paid.error).toBeNull();
    const prepare = () => admin.rpc("prepare_full_stripe_refund", {
      p_payment_id: fixture.paymentId,
      p_reason: "E2E 6C concurrency",
      p_actor_user_id: null,
    });
    const [a, b] = await Promise.all([prepare(), prepare()]);
    expect(a.error).toBeNull();
    expect(b.error).toBeNull();
    expect(isRpcSuccess(a.data)).toBe(true);
    expect(isRpcSuccess(b.data)).toBe(true);
    const ids = new Set([
      (a.data as { refundId: string }).refundId,
      (b.data as { refundId: string }).refundId,
    ]);
    expect(ids.size).toBe(1);
    const refundId = [...ids][0];
    const { count } = await admin.from("payment_refunds")
      .select("id", { count: "exact", head: true })
      .eq("payment_id", fixture.paymentId);
    expect(count).toBe(1);
    const providerRefundId = `re_e2e_${crypto.randomUUID().replaceAll("-", "")}`;
    const { error: attachError } = await admin.rpc("attach_stripe_refund", {
      p_refund_id: refundId,
      p_provider_refund_id: providerRefundId,
      p_provider_payment_intent_id: fixture.paymentIntentId,
      p_amount_minor: 1500,
      p_currency: "ron",
    });
    expect(attachError).toBeNull();
    const { data: failed, error: failedError } = await admin.rpc(
      "process_stripe_refund_event",
      {
        p_event_id: `evt_e2e_${crypto.randomUUID().replaceAll("-", "")}`,
        p_event_type: "refund.failed",
        p_provider_refund_id: providerRefundId,
        p_provider_payment_intent_id: fixture.paymentIntentId,
        p_refund_id: refundId,
        p_payment_id: fixture.paymentId,
        p_order_id: fixture.orderId,
        p_amount_minor: 1500,
        p_currency: "ron",
        p_refund_status: "failed",
        p_failure_reason: "expired_or_canceled_card",
      },
    );
    expect(failedError).toBeNull();
    expect(isRpcSuccess(failed)).toBe(true);
    const { data: finalRefund } = await admin.from("payment_refunds")
      .select("status, failure_reason").eq("id", refundId).single();
    const { data: finalPayment } = await admin.from("payments")
      .select("status").eq("id", fixture.paymentId).single();
    expect(finalRefund).toMatchObject({
      status: "failed",
      failure_reason: "expired_or_canceled_card",
    });
    expect(finalPayment?.status).toBe("paid");
  });
});

type AttachedCard = {
  orderId: string;
  paymentId: string;
  sessionId: string;
  paymentIntentId: string;
  expiresAt: string;
};

async function prepareAttachedCard(productId: string): Promise<AttachedCard> {
  const prepared = await prepareCard(productId, crypto.randomUUID());
  expect(isRpcSuccess(prepared)).toBe(true);
  if (!isRpcSuccess(prepared)) throw new Error("Card fixture preparation failed.");
  const sessionId = `cs_test_e2e_${crypto.randomUUID().replaceAll("-", "")}`;
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
  const { data: attached, error } = await admin.rpc("attach_stripe_checkout_session", {
    p_payment_id: prepared.paymentId,
    p_session_id: sessionId,
    p_session_expires_at: expiresAt,
  });
  expect(error).toBeNull();
  expect(isRpcSuccess(attached)).toBe(true);
  return {
    orderId: prepared.orderId,
    paymentId: prepared.paymentId,
    sessionId,
    paymentIntentId: `pi_e2e_${crypto.randomUUID().replaceAll("-", "")}`,
    expiresAt,
  };
}

function processCheckoutEvent(
  fixture: AttachedCard,
  eventId: string,
  transition: "completed" | "expired",
) {
  return admin.rpc("process_stripe_checkout_event_hardened", {
    p_event_id: eventId,
    p_event_type: `checkout.session.${transition}`,
    p_session_id: fixture.sessionId,
    p_payment_intent_id: transition === "completed" ? fixture.paymentIntentId : null,
    p_payment_id: fixture.paymentId,
    p_order_id: fixture.orderId,
    p_amount_total: 1500,
    p_currency: "ron",
    p_payment_status: transition === "completed" ? "paid" : "unpaid",
    p_mode: "payment",
    p_session_expires_at: fixture.expiresAt,
  });
}

async function prepareCard(productId: string, key: string) {
  const { data, error } = await admin.rpc("prepare_card_order_server", {
    p_idempotency_key: key,
    p_lines: lines(productId),
    p_checkout: checkout(),
    p_user_id: null,
  });
  if (error) return { success: false, code: error.code };
  return data;
}

function lines(productId: string) {
  return [{ key: `line-${productId}`, productId, variantId: null, quantity: 1, customizations: [] }];
}

function checkout() {
  return {
    email: "concurrency-6c@example.com",
    phone: "0712345678",
    customerType: "individual",
    companyName: "",
    companyTaxId: "",
    companyRegistrationNumber: "",
    shippingAddress: {
      recipientName: "Test Concurrency", phone: "0712345678",
      addressLine1: "Strada Test 1", addressLine2: "", city: "București",
      county: "București", postalCode: "010101", countryCode: "RO",
    },
    billingSameAsShipping: true,
    billingAddress: {},
    shippingMethodId: shippingId,
    paymentMethod: "card",
  };
}

async function getInventoryId(productId: string) {
  const { data, error } = await admin.from("inventory")
    .select("id").eq("product_id", productId).single();
  if (error || !data) throw error ?? new Error("Inventory fixture missing.");
  return data.id as string;
}

function isRpcSuccess(value: unknown): value is {
  success: true; orderId: string; paymentId: string;
} {
  return typeof value === "object" && value !== null &&
    (value as { success?: unknown }).success === true;
}
