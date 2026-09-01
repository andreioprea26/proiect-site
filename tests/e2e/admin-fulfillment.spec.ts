import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "";
const customerEmail = process.env.E2E_TEST_EMAIL ?? "";
const customerPassword = process.env.E2E_TEST_PASSWORD ?? "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const hasIntegration = Boolean(adminEmail && adminPassword && customerEmail && customerPassword && supabaseUrl && supabaseKey && serviceRoleKey);

test.describe.serial("7B shipments, anulare COD și refund admin", () => {
  test.skip(!hasIntegration, "Necesită credențialele E2E și Supabase Development.");

  let service: SupabaseClient;
  let adminAuth: SupabaseClient;
  let customerAuth: SupabaseClient;
  const namespace = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const shippingId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const inventoryId = crypto.randomUUID();
  const shipOrderId = crypto.randomUUID();
  const cancelOrderId = crypto.randomUUID();
  const paidOrderId = crypto.randomUUID();
  let paidPaymentId = "";

  test.beforeAll(async () => {
    service = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    adminAuth = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
    customerAuth = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const adminLogin = await adminAuth.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    if (adminLogin.error) throw adminLogin.error;
    const customerLogin = await customerAuth.auth.signInWithPassword({ email: customerEmail, password: customerPassword });
    if (customerLogin.error) throw customerLogin.error;

    const shipping = await service.from("shipping_methods").insert({
      id: shippingId,
      code: `fulfillment-${namespace}`,
      name: `Curier Fulfillment ${namespace}`,
      price_minor: 900,
      is_active: false,
    });
    if (shipping.error) throw shipping.error;
    const product = await service.from("products").insert({
      id: productId,
      name: `Produs Fulfillment ${namespace}`,
      slug: `produs-fulfillment-${namespace}`,
      base_price: 41,
      product_type: "standard",
      publication_status: "draft",
      availability_status: "in_stock",
    });
    if (product.error) throw product.error;
    const inventory = await service.from("inventory").insert({ id: inventoryId, product_id: productId, quantity: 3 });
    if (inventory.error) throw inventory.error;

    const address = { recipientName: `Client 7B ${namespace}`, phone: "0712345678", addressLine1: "Strada 7B", city: "București", county: "București", postalCode: "010101", countryCode: "RO" };
    const common = {
      request_fingerprint: {},
      phone: "0712345678",
      customer_type: "individual",
      shipping_address: address,
      billing_same_as_shipping: true,
      billing_address: address,
      shipping_method_id: shippingId,
      shipping_method_code: `fulfillment-${namespace}`,
      shipping_method_name: `Curier Fulfillment ${namespace}`,
      subtotal_minor: 4100,
      shipping_minor: 900,
      total_minor: 5000,
      currency: "RON",
    };
    const orders = await service.from("orders").insert([
      { ...common, id: shipOrderId, idempotency_key: crypto.randomUUID(), email: `ship-${namespace}@example.com`, payment_method: "cash_on_delivery", payment_status: "unpaid", status: "ready" },
      { ...common, id: cancelOrderId, idempotency_key: crypto.randomUUID(), email: `cancel-${namespace}@example.com`, payment_method: "cash_on_delivery", payment_status: "unpaid", status: "in_progress" },
      { ...common, id: paidOrderId, idempotency_key: crypto.randomUUID(), email: `paid-${namespace}@example.com`, payment_method: "card", payment_status: "paid", status: "paid" },
    ]);
    if (orders.error) throw orders.error;
    const history = await service.from("order_status_history").insert([
      { order_id: shipOrderId, from_status: "in_progress", to_status: "ready", note: "Fixture 7B ready" },
      { order_id: cancelOrderId, from_status: "new", to_status: "in_progress", note: "Fixture 7B cancel" },
      { order_id: paidOrderId, from_status: "awaiting_payment", to_status: "paid", note: "Fixture 7B paid" },
    ]);
    if (history.error) throw history.error;
    const movement = await service.from("inventory_movements").insert({
      inventory_id: inventoryId,
      quantity_delta: -2,
      quantity_before: 5,
      quantity_after: 3,
      reason: "Plasare comandă ramburs",
      context: { source: "place_cod_order", orderId: cancelOrderId },
    });
    if (movement.error) throw movement.error;
    const payment = await service.from("payments").insert({
      order_id: paidOrderId,
      provider: "stripe",
      status: "paid",
      amount_minor: 5000,
      currency: "RON",
      idempotency_key: crypto.randomUUID(),
      pending_expires_at: new Date(Date.now() + 60_000).toISOString(),
      provider_payment_id: `pi_e2e_7b_${namespace}`,
      provider_checkout_session_id: `cs_test_e2e_7b_${namespace}`,
      paid_at: new Date().toISOString(),
    }).select("id").single();
    if (payment.error) throw payment.error;
    paidPaymentId = payment.data.id;
  });

  test.afterAll(async () => {
    if (!service) return;
    await service.from("orders").delete().in("id", [shipOrderId, cancelOrderId, paidOrderId]);
    await service.from("products").delete().eq("id", productId);
    await service.from("shipping_methods").delete().eq("id", shippingId);
    await adminAuth?.auth.signOut({ scope: "local" });
    await customerAuth?.auth.signOut({ scope: "local" });
  });

  test("admin configurează tracking și marchează ready drept shipped cu istoric unic", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto(`/admin/orders/${shipOrderId}`);
    await expect(page.getByRole("heading", { name: "Expediere" })).toBeVisible();
    const shipment = page.getByTestId("shipment-form");
    await shipment.getByLabel("Curier").fill("Curier E2E Manual");
    await shipment.getByLabel("AWB / tracking number").fill(`AWB-${namespace}`);
    await shipment.getByLabel("URL tracking HTTPS opțional").fill(`https://tracking.example.com/${namespace}`);
    await shipment.getByRole("button", { name: "Salvează expedierea" }).click();
    await expect(page.getByText("Datele de expediere au fost salvate și auditate.")).toBeVisible();

    await page.getByTestId("mark-shipped-form").getByRole("button", { name: "Marchează drept expediată" }).click();
    await expect(page.getByText("Expediată").first()).toBeVisible();
    await expect.poll(async () => {
      const { count } = await service.from("order_status_history").select("id", { count: "exact", head: true }).eq("order_id", shipOrderId).eq("to_status", "shipped");
      return count;
    }).toBe(1);
    const { data: saved } = await service.from("shipments").select("carrier, tracking_number, shipped_at").eq("order_id", shipOrderId).single();
    expect(saved).toMatchObject({ carrier: "Curier E2E Manual", tracking_number: `AWB-${namespace}` });
    expect(saved?.shipped_at).toBeTruthy();
  });

  test("anularea COD confirmată restochează exact o dată", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto(`/admin/orders/${cancelOrderId}`);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("cancel-order-form").getByRole("button", { name: "Anulează comanda" }).click();
    await expect(page.getByText(/inventarul consumat a fost restaurat exact o dată/i)).toBeVisible();
    const { data: inventory } = await service.from("inventory").select("quantity").eq("id", inventoryId).single();
    expect(inventory?.quantity).toBe(5);
    const { count } = await service.from("inventory_movements").select("id", { count: "exact", head: true }).eq("inventory_id", inventoryId).contains("context", { source: "admin_cod_cancellation", orderId: cancelOrderId });
    expect(count).toBe(1);
  });

  test("Stripe paid oferă Refund, ascunde Cancel și cere confirmare", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto(`/admin/orders/${paidOrderId}`);
    await expect(page.getByRole("button", { name: "Refund integral Stripe" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Anulează comanda" })).toHaveCount(0);
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "Refund integral Stripe" }).click();
    const { count } = await service.from("payment_refunds").select("id", { count: "exact", head: true }).eq("payment_id", paidPaymentId);
    expect(count).toBe(0);
  });

  test("non-admin și browserul nu pot forța shipment, status sau refund", async () => {
    const shipment = await customerAuth.rpc("configure_admin_shipment", {
      p_order_id: paidOrderId,
      p_carrier: "Atac",
      p_tracking_number: "AWB-ATAC",
      p_tracking_url: null,
      p_request_id: crypto.randomUUID(),
    });
    expect(shipment.error).toBeNull();
    expect(shipment.data).toMatchObject({ success: false, code: "unauthorized" });
    const direct = await customerAuth.from("shipments").insert({ order_id: paidOrderId, carrier: "Atac" });
    expect(direct.error).not.toBeNull();
    const bypass = await customerAuth.rpc("transition_admin_order_status", {
      p_order_id: paidOrderId,
      p_to_status: "shipped",
      p_request_id: crypto.randomUUID(),
      p_note: null,
    });
    expect(bypass.data).toMatchObject({ success: false, code: "unauthorized" });
  });
});

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Parolă").fill(password);
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}
