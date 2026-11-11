import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { allowedOrderTransitions } from "../../src/lib/admin/order-model";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "";
const customerEmail = process.env.E2E_TEST_EMAIL ?? "";
const customerPassword = process.env.E2E_TEST_PASSWORD ?? "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const hasAdminIntegration = Boolean(adminEmail && adminPassword && supabaseUrl && supabaseKey && serviceRoleKey);

test("tranzițiile operaționale nu degradează stările Stripe sau terminale", () => {
  expect(allowedOrderTransitions({ status: "awaiting_payment", paymentStatus: "pending", hasCustomizations: false })).toEqual([]);
  expect(allowedOrderTransitions({ status: "refunded", paymentStatus: "refunded", hasCustomizations: true })).toEqual([]);
  expect(allowedOrderTransitions({ status: "completed", paymentStatus: "paid", hasCustomizations: false })).toEqual(["returned"]);
  expect(allowedOrderTransitions({ status: "paid", paymentStatus: "paid", hasCustomizations: true })).toEqual(["awaiting_customization_review", "in_progress"]);
});

test("shipping și anularea sunt scoase din tranziția generică", () => {
  expect(allowedOrderTransitions({ status: "in_progress", paymentStatus: "paid", hasCustomizations: false })).toEqual(["ready"]);
  expect(allowedOrderTransitions({ status: "in_progress", paymentStatus: "unpaid", hasCustomizations: false })).toEqual(["ready"]);
  expect(allowedOrderTransitions({ status: "ready", paymentStatus: "unpaid", hasCustomizations: false })).toEqual([]);
});

test("vizitatorul nu poate accesa lista sau detaliul comenzilor admin", async ({ page }) => {
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto(`/admin/orders/${crypto.randomUUID()}`);
  await expect(page).toHaveURL(/\/login$/);
});

test("un customer autentificat nu poate accesa comenzile admin", async ({ page }) => {
  test.skip(!customerEmail || !customerPassword, "Necesită credențialele E2E customer.");
  await login(page, customerEmail, customerPassword);
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/$/);
});

test.describe.serial("administrare comenzi cu fixture-uri Development izolate", () => {
  test.skip(!hasAdminIntegration, "Necesită credențialele admin și Supabase Development server env.");

  let service: SupabaseClient;
  let adminAuth: SupabaseClient;
  const namespace = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const shippingId = crypto.randomUUID();
  const codOrderId = crypto.randomUUID();
  const cardOrderId = crypto.randomUUID();
  const refundedOrderId = crypto.randomUUID();
  let codPublicNumber = "";
  let cardPublicNumber = "";
  let cardPaymentId = "";

  test.beforeAll(async () => {
    service = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    adminAuth = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error: signInError } = await adminAuth.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    if (signInError) throw signInError;

    await removeAdminOrderFixtures(service, []);

    const { error: shippingError } = await service.from("shipping_methods").insert({
      id: shippingId,
      code: `admin-orders-${namespace}`,
      name: `Curier Admin Orders ${namespace}`,
      price_minor: 900,
      is_active: false,
      display_order: 0,
    });
    if (shippingError) throw shippingError;

    const address = {
      recipientName: `Client Snapshot ${namespace}`,
      phone: "0712345678",
      addressLine1: "Strada Snapshot 7A",
      addressLine2: "Etaj 1",
      city: "București",
      county: "București",
      postalCode: "010101",
      countryCode: "RO",
    };
    const common = {
      request_fingerprint: {},
      phone: "0712345678",
      customer_type: "individual",
      shipping_address: address,
      billing_same_as_shipping: true,
      billing_address: address,
      shipping_method_id: shippingId,
      shipping_method_code: `admin-orders-${namespace}`,
      shipping_method_name: `Curier Admin Orders ${namespace}`,
      subtotal_minor: 4100,
      shipping_minor: 900,
      total_minor: 5000,
      currency: "RON",
    };
    const { data: orders, error: orderError } = await service.from("orders").insert([
      { ...common, id: codOrderId, idempotency_key: crypto.randomUUID(), email: `cod-${namespace}@example.com`, payment_method: "cash_on_delivery", payment_status: "unpaid", status: "new" },
      { ...common, id: cardOrderId, idempotency_key: crypto.randomUUID(), email: `card-${namespace}@example.com`, payment_method: "card", payment_status: "paid", status: "paid" },
      { ...common, id: refundedOrderId, idempotency_key: crypto.randomUUID(), email: `refund-${namespace}@example.com`, payment_method: "card", payment_status: "refunded", status: "refunded" },
    ]).select("id, public_number");
    if (orderError) throw orderError;
    codPublicNumber = orders?.find((order) => order.id === codOrderId)?.public_number ?? "";
    cardPublicNumber = orders?.find((order) => order.id === cardOrderId)?.public_number ?? "";

    const { error: itemError } = await service.from("order_items").insert([
      {
        order_id: codOrderId,
        product_name: `Produs snapshot ${namespace}`,
        product_slug: `produs-snapshot-${namespace}`,
        variant_snapshot: { id: crypto.randomUUID(), title: "Mărime specială", attributes: { mărime: "M" } },
        customizations_snapshot: [{ id: crypto.randomUUID(), name: "Mesaj", optionType: "text", value: "Text istoric", displayValue: "Text istoric", additionalCostMinor: 600 }],
        unit_base_price_minor: 3500,
        customization_total_minor: 600,
        unit_price_minor: 4100,
        quantity: 1,
        line_subtotal_minor: 4100,
      },
      {
        order_id: cardOrderId,
        product_name: `Produs card snapshot ${namespace}`,
        product_slug: `produs-card-snapshot-${namespace}`,
        variant_snapshot: null,
        customizations_snapshot: [],
        unit_base_price_minor: 4100,
        customization_total_minor: 0,
        unit_price_minor: 4100,
        quantity: 1,
        line_subtotal_minor: 4100,
      },
    ]);
    if (itemError) throw itemError;

    const { error: historyError } = await service.from("order_status_history").insert([
      { order_id: codOrderId, from_status: null, to_status: "new", note: "Fixture COD 7A" },
      { order_id: cardOrderId, from_status: null, to_status: "awaiting_payment", note: "Fixture card 7A" },
      { order_id: cardOrderId, from_status: "awaiting_payment", to_status: "paid", note: "Webhook fixture 7A" },
      { order_id: refundedOrderId, from_status: null, to_status: "refunded", note: "Refund fixture 7A" },
    ]);
    if (historyError) throw historyError;

    const paidAt = new Date().toISOString();
    const { data: payments, error: paymentError } = await service.from("payments").insert([
      { order_id: cardOrderId, provider: "stripe", status: "paid", amount_minor: 5000, currency: "RON", idempotency_key: crypto.randomUUID(), pending_expires_at: new Date(Date.now() + 60_000).toISOString(), provider_payment_id: `pi_e2e_${namespace}`, provider_checkout_session_id: `cs_test_e2e_${namespace}`, paid_at: paidAt },
      { order_id: refundedOrderId, provider: "stripe", status: "refunded", amount_minor: 5000, currency: "RON", idempotency_key: crypto.randomUUID(), pending_expires_at: new Date(Date.now() + 60_000).toISOString(), provider_payment_id: `pi_e2e_refund_${namespace}`, provider_checkout_session_id: `cs_test_e2e_refund_${namespace}`, paid_at: paidAt, refunded_at: paidAt },
    ]).select("id, order_id");
    if (paymentError) throw paymentError;
    cardPaymentId = payments?.find((payment) => payment.order_id === cardOrderId)?.id ?? "";
    const refundedPaymentId = payments?.find((payment) => payment.order_id === refundedOrderId)?.id ?? "";
    const { error: refundError } = await service.from("payment_refunds").insert({
      payment_id: refundedPaymentId,
      provider_refund_id: `re_e2e_${namespace}`,
      provider_payment_intent_id: `pi_e2e_refund_${namespace}`,
      amount_minor: 5000,
      currency: "RON",
      status: "succeeded",
      idempotency_key: `admin-orders-${namespace}`,
      reason: "Fixture refund 7A",
      metadata: { kind: "full" },
      succeeded_at: paidAt,
    });
    if (refundError) throw refundError;
  });

  test.afterAll(async () => {
    if (!service) return;
    await removeAdminOrderFixtures(service, [codOrderId, cardOrderId, refundedOrderId]);
    await adminAuth?.auth.signOut({ scope: "local" });
  });

  test("admin vede lista, caută fără PII în URL și deschide snapshot-ul COD", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { level: 1, name: "Comenzi" })).toBeVisible();
    await expect(page.getByText(codPublicNumber).first()).toBeVisible();
    await expect(page.getByText(cardPublicNumber).first()).toBeVisible();

    await page.getByLabel("Număr comandă sau e-mail").fill(`cod-${namespace}@example.com`);
    await page.getByRole("button", { name: "Caută și filtrează" }).click();
    await expect(page.getByText(codPublicNumber).first()).toBeVisible();
    expect(page.url()).not.toContain("example.com");

    await page
      .getByRole("row")
      .filter({ hasText: codPublicNumber })
      .getByRole("link", { name: "Deschide" })
      .click();
    await expect(page).toHaveURL(new RegExp(`/admin/orders/${codOrderId}$`));
    await expect(page.getByText(`Produs snapshot ${namespace}`)).toBeVisible();
    await expect(page.getByText("Mărime specială · mărime: M")).toBeVisible();
    await expect(page.getByText("Mesaj: Text istoric · 6,00 RON")).toBeVisible();
    await expect(page.getByText(/Încasarea COD este o stare financiară separată/i)).toBeVisible();
  });

  test("Stripe este afișat din payments, iar admin-ul nu poate falsifica plata", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto(`/admin/orders/${cardOrderId}`);
    await expect(page.getByText("Card online")).toBeVisible();
    await expect(page.getByText("Achitată")).toBeVisible();
    await expect(page.getByText(`pi_e2e_${namespace}`)).toBeVisible();
    await expect(page.getByText(/numai de webhook-ul semnat/i)).toBeVisible();

    const { data: before } = await service.from("payments").select("status").eq("id", cardPaymentId).single();
    const { data: result, error } = await adminAuth.rpc("transition_admin_order_status", {
      p_order_id: cardOrderId,
      p_to_status: "in_progress",
      p_request_id: crypto.randomUUID(),
      p_note: "Procesare E2E",
    });
    expect(error).toBeNull();
    expect(result).toMatchObject({ success: true });
    const { data: after } = await service.from("payments").select("status").eq("id", cardPaymentId).single();
    expect(before?.status).toBe("paid");
    expect(after?.status).toBe("paid");

    await page.goto(`/admin/orders/${refundedOrderId}`);
    await expect(page.getByRole("heading", { name: "Refund-uri" })).toBeVisible();
    await expect(page.getByText("succeeded")).toBeVisible();
    await expect(page.getByText("Fixture refund 7A")).toBeVisible();
  });

  test("tranziția validă este atomică, iar dublu submit nu dublează istoricul", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto(`/admin/orders/${codOrderId}`);
    const form = page.getByTestId("order-status-form");
    await form.getByLabel("Status nou").selectOption("in_progress");
    await form.evaluate((element) => {
      (element as HTMLFormElement).requestSubmit();
      (element as HTMLFormElement).requestSubmit();
    });
    await expect(page.getByText("În lucru").first()).toBeVisible();
    await expect.poll(async () => {
      const { count } = await service.from("order_status_history").select("id", { count: "exact", head: true }).eq("order_id", codOrderId).eq("from_status", "new").eq("to_status", "in_progress");
      return count;
    }).toBe(1);
  });

  test("tranzițiile invalide și refunded spre paid sunt refuzate", async () => {
    const invalid = await adminAuth.rpc("transition_admin_order_status", {
      p_order_id: codOrderId,
      p_to_status: "completed",
      p_request_id: crypto.randomUUID(),
      p_note: null,
    });
    expect(invalid.error).toBeNull();
    expect(invalid.data).toMatchObject({ success: false, code: "invalid_transition" });
    const refunded = await adminAuth.rpc("transition_admin_order_status", {
      p_order_id: refundedOrderId,
      p_to_status: "paid",
      p_request_id: crypto.randomUUID(),
      p_note: null,
    });
    expect(refunded.error).toBeNull();
    expect(refunded.data).toMatchObject({ success: false, code: "invalid_transition" });
  });

  test("browserul anonim nu poate actualiza orders sau insera istoric direct", async () => {
    const adminDirectUpdate = await adminAuth.from("orders").update({ status: "completed" }).eq("id", codOrderId);
    expect(adminDirectUpdate.error).not.toBeNull();
    const adminDirectHistory = await adminAuth.from("order_status_history").insert({ order_id: codOrderId, from_status: "in_progress", to_status: "completed" });
    expect(adminDirectHistory.error).not.toBeNull();

    const browserClient = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const update = await browserClient.from("orders").update({ status: "completed" }).eq("id", codOrderId);
    expect(update.error).not.toBeNull();
    const insert = await browserClient.from("order_status_history").insert({ order_id: codOrderId, from_status: "in_progress", to_status: "completed" });
    expect(insert.error).not.toBeNull();
  });
});

async function removeAdminOrderFixtures(service: SupabaseClient, orderIds: string[]) {
  const staleOrders = await service.from("orders").select("id").like("shipping_method_code", "admin-orders-%");
  if (staleOrders.error) throw staleOrders.error;
  const fixtureOrderIds = [...new Set([...orderIds, ...staleOrders.data.map((order) => order.id)])];

  if (fixtureOrderIds.length > 0) {
    const payments = await service.from("payments").select("id").in("order_id", fixtureOrderIds);
    if (payments.error) throw payments.error;
    if (payments.data.length > 0) {
      const refunds = await service.from("payment_refunds").delete().in("payment_id", payments.data.map((payment) => payment.id));
      if (refunds.error) throw refunds.error;
    }
    const orders = await service.from("orders").delete().in("id", fixtureOrderIds);
    if (orders.error) throw orders.error;
  }

  const shipping = await service.from("shipping_methods").delete().like("code", "admin-orders-%");
  if (shipping.error) throw shipping.error;
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Parolă").fill(password);
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}
