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

test.describe.serial("7C notificări, COD și dashboard admin", () => {
  test.skip(!hasIntegration, "Necesită credențialele E2E și Supabase Development.");

  let service: SupabaseClient;
  let adminAuth: SupabaseClient;
  let customerAuth: SupabaseClient;
  const namespace = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const shippingId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const inventoryId = crypto.randomUUID();
  const codOrderId = crypto.randomUUID();
  const newOrderId = crypto.randomUUID();
  const customOrderId = crypto.randomUUID();
  const pendingOrderId = crypto.randomUUID();
  const shippedOrderId = crypto.randomUUID();
  const pendingPaymentId = crypto.randomUUID();
  const failedNotificationId = crypto.randomUUID();
  const shippedNotificationId = crypto.randomUUID();
  let codPublicNumber = "";
  let newPublicNumber = "";
  let customPublicNumber = "";

  test.beforeAll(async () => {
    service = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    adminAuth = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
    customerAuth = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const adminLogin = await adminAuth.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    if (adminLogin.error) throw adminLogin.error;
    const customerLogin = await customerAuth.auth.signInWithPassword({ email: customerEmail, password: customerPassword });
    if (customerLogin.error) throw customerLogin.error;

    // Recover only stale fixtures owned by this suite if an earlier serial run
    // was interrupted before afterAll.
    await service.from("orders").delete().like("email", "%-7c-%@example.com");
    await service.from("products").delete().like("name", "Produs stoc 7C %");
    await service.from("shipping_methods").delete().like("name", "Curier Operations %");

    const shipping = await service.from("shipping_methods").insert({
      id: shippingId,
      code: `operations-${namespace}`,
      name: `Curier Operations ${namespace}`,
      price_minor: 500,
      is_active: false,
    });
    if (shipping.error) throw shipping.error;
    const product = await service.from("products").insert({
      id: productId,
      name: `Produs stoc 7C ${namespace}`,
      slug: `produs-stoc-7c-${namespace}`,
      base_price: 10,
      product_type: "standard",
      publication_status: "draft",
      availability_status: "in_stock",
    });
    if (product.error) throw product.error;
    const inventory = await service.from("inventory").insert({
      id: inventoryId,
      product_id: productId,
      quantity: 5,
      low_stock_threshold: 3,
    });
    if (inventory.error) throw inventory.error;

    const address = { recipientName: `Client 7C ${namespace}`, phone: "0712345678", addressLine1: "Strada 7C", city: "Iași", county: "Iași", postalCode: "700001", countryCode: "RO" };
    const common = {
      request_fingerprint: {}, phone: "0712345678", customer_type: "individual",
      shipping_address: address, billing_same_as_shipping: true, billing_address: address,
      shipping_method_id: shippingId, shipping_method_code: `operations-${namespace}`,
      shipping_method_name: `Curier Operations ${namespace}`,
      subtotal_minor: 1000, shipping_minor: 500, total_minor: 1500, currency: "RON",
    };
    const orders = await service.from("orders").insert([
      { ...common, id: codOrderId, idempotency_key: crypto.randomUUID(), email: `cod-7c-${namespace}@example.com`, payment_method: "cash_on_delivery", payment_status: "unpaid", status: "shipped" },
      { ...common, id: newOrderId, idempotency_key: crypto.randomUUID(), email: `new-7c-${namespace}@example.com`, payment_method: "cash_on_delivery", payment_status: "unpaid", status: "new" },
      { ...common, id: customOrderId, idempotency_key: crypto.randomUUID(), email: `custom-7c-${namespace}@example.com`, payment_method: "cash_on_delivery", payment_status: "unpaid", status: "awaiting_customization_review" },
      { ...common, id: pendingOrderId, idempotency_key: crypto.randomUUID(), email: `pending-7c-${namespace}@example.com`, payment_method: "card", payment_status: "pending", status: "awaiting_payment" },
      { ...common, id: shippedOrderId, idempotency_key: crypto.randomUUID(), email: `shipped-7c-${namespace}@example.com`, payment_method: "cash_on_delivery", payment_status: "unpaid", status: "shipped" },
    ]).select("id, public_number");
    if (orders.error) throw orders.error;
    codPublicNumber = orders.data.find((order) => order.id === codOrderId)?.public_number ?? "";
    newPublicNumber = orders.data.find((order) => order.id === newOrderId)?.public_number ?? "";
    customPublicNumber = orders.data.find((order) => order.id === customOrderId)?.public_number ?? "";

    const items = await service.from("order_items").insert([
      { order_id: codOrderId, product_name: `Produs COD ${namespace}`, product_slug: `produs-cod-${namespace}`, customizations_snapshot: [], unit_base_price_minor: 1000, customization_total_minor: 0, unit_price_minor: 1000, quantity: 1, line_subtotal_minor: 1000 },
      { order_id: customOrderId, product_name: `Produs personalizat ${namespace}`, product_slug: `produs-personalizat-${namespace}`, customizations_snapshot: [{ name: "Mesaj", displayValue: "Review 7C", additionalCostMinor: 0 }], unit_base_price_minor: 1000, customization_total_minor: 0, unit_price_minor: 1000, quantity: 1, line_subtotal_minor: 1000 },
      { order_id: shippedOrderId, product_name: `Produs shipped ${namespace}`, product_slug: `produs-shipped-${namespace}`, customizations_snapshot: [], unit_base_price_minor: 1000, customization_total_minor: 0, unit_price_minor: 1000, quantity: 1, line_subtotal_minor: 1000 },
    ]);
    if (items.error) throw items.error;
    const history = await service.from("order_status_history").insert([
      { order_id: codOrderId, from_status: "ready", to_status: "shipped", note: "Fixture COD shipped 7C" },
      { order_id: newOrderId, from_status: null, to_status: "new", note: "Fixture new 7C" },
      { order_id: customOrderId, from_status: "new", to_status: "awaiting_customization_review", note: "Review manual 7C" },
      { order_id: pendingOrderId, from_status: null, to_status: "awaiting_payment", note: "Fixture reservation 7C" },
      { order_id: shippedOrderId, from_status: "ready", to_status: "shipped", note: "Fixture shipped 7C" },
    ]);
    if (history.error) throw history.error;
    const shipments = await service.from("shipments").insert([
      { order_id: codOrderId, carrier: "Curier COD 7C", tracking_number: `COD-${namespace}`, tracking_url: `https://tracking.example.com/cod-${namespace}`, shipped_at: new Date().toISOString() },
      { order_id: shippedOrderId, carrier: "Curier Shipped 7C", tracking_number: `SHIP-${namespace}`, tracking_url: `https://tracking.example.com/ship-${namespace}`, shipped_at: new Date().toISOString() },
    ]);
    if (shipments.error) throw shipments.error;
    const payment = await service.from("payments").insert({
      id: pendingPaymentId, order_id: pendingOrderId, provider: "internal", status: "pending",
      amount_minor: 1500, currency: "RON", idempotency_key: crypto.randomUUID(),
      pending_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    if (payment.error) throw payment.error;
    const reservation = await service.from("stock_reservations").insert({
      order_id: pendingOrderId, payment_id: pendingPaymentId, inventory_id: inventoryId,
      quantity: 3, request_idempotency_key: crypto.randomUUID(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    if (reservation.error) throw reservation.error;

    const now = new Date().toISOString();
    const notifications = await service.from("notification_logs").insert([
      { id: failedNotificationId, order_id: newOrderId, notification_type: "order_confirmation", recipient: `new-7c-${namespace}@example.com`, status: "failed", attempt_count: 1, last_error: "email_test_recipient_missing", last_attempt_at: now, source: "cod_checkout", dedupe_key: `order:${newOrderId}:order_confirmation` },
      { id: shippedNotificationId, order_id: shippedOrderId, notification_type: "shipped", recipient: `shipped-7c-${namespace}@example.com`, status: "sent", attempt_count: 1, provider_message_id: `email_e2e_${namespace}`, last_attempt_at: now, sent_at: now, source: "admin_shipment", dedupe_key: `order:${shippedOrderId}:shipped` },
    ]);
    if (notifications.error) throw notifications.error;
    const attempts = await service.from("notification_attempts").insert([
      { notification_id: failedNotificationId, attempt_number: 1, request_id: crypto.randomUUID(), status: "failed", safe_error: "email_test_recipient_missing", completed_at: now },
      { notification_id: shippedNotificationId, attempt_number: 1, request_id: crypto.randomUUID(), status: "sent", provider_message_id: `email_e2e_${namespace}`, completed_at: now },
    ]);
    if (attempts.error) throw attempts.error;
  });

  test.afterAll(async () => {
    if (!service) return;
    await service.from("orders").delete().in("id", [codOrderId, newOrderId, customOrderId, pendingOrderId, shippedOrderId]);
    await service.from("products").delete().eq("id", productId);
    await service.from("shipping_methods").delete().eq("id", shippingId);
    await adminAuth?.auth.signOut({ scope: "local" });
    await customerAuth?.auth.signOut({ scope: "local" });
  });

  test("admin vede istoricul notificărilor și eroarea sigură", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto(`/admin/orders/${newOrderId}`);
    await expect(page.getByRole("heading", { name: "Notificări" })).toBeVisible();
    await expect(page.getByTestId("notification-history")).toContainText("Confirmare comandă");
    await expect(page.getByText("Eroare sigură: email_test_recipient_missing")).toBeVisible();
  });

  test("notificarea failed oferă retry admin", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto(`/admin/orders/${newOrderId}`);
    await expect(page.getByRole("button", { name: "Retrimite" })).toBeVisible();
  });

  test("retry fără configurație Resend rămâne failed și este auditat", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto(`/admin/orders/${newOrderId}`);
    await page.getByRole("button", { name: "Retrimite" }).click();
    await expect(page.getByText(/Retrimiterea a eșuat/i)).toBeVisible();
    await expect.poll(async () => (await service.from("notification_attempts").select("id", { count: "exact", head: true }).eq("notification_id", failedNotificationId)).count).toBe(2);
  });

  test("non-admin nu poate retrimite sau modifica notificări", async () => {
    const direct = await customerAuth.from("notification_logs").update({ status: "sent" }).eq("id", failedNotificationId);
    expect(direct.error).not.toBeNull();
    const claim = await customerAuth.rpc("claim_notification_delivery", { p_notification_id: failedNotificationId, p_request_id: crypto.randomUUID(), p_actor_user_id: null });
    expect(claim.error).not.toBeNull();
  });

  test("comanda COD afișează registrul neîncasat", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto(`/admin/orders/${codOrderId}`);
    await expect(page.getByText("Neîncasat")).toBeVisible();
    await expect(page.getByRole("button", { name: "Marchează ramburs încasat" })).toBeVisible();
  });

  test("admin marchează COD collected fără să schimbe shipped", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto(`/admin/orders/${codOrderId}`);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Marchează ramburs încasat" }).click();
    await expect(page.getByText("Încasarea ramburs a fost confirmată")).toBeVisible();
    const { data: order } = await service.from("orders").select("status, payment_status").eq("id", codOrderId).single();
    expect(order).toMatchObject({ status: "shipped", payment_status: "paid" });
  });

  test("retry COD collection este idempotent", async () => {
    const { data: collection } = await service.from("cod_collections").select("collection_request_id").eq("order_id", codOrderId).single();
    const replay = await adminAuth.rpc("collect_admin_cod_payment", { p_order_id: codOrderId, p_request_id: collection?.collection_request_id });
    expect(replay.error).toBeNull();
    expect(replay.data).toMatchObject({ success: true, idempotentReplay: true });
    expect((await service.from("cod_collection_events").select("id", { count: "exact", head: true }).eq("order_id", codOrderId)).count).toBe(1);
  });

  test("payment confirmation COD apare în notification history", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto(`/admin/orders/${codOrderId}`);
    await expect(page.getByTestId("notification-history")).toContainText("Confirmare plată");
  });

  test("COD collected blochează anularea simplă", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto(`/admin/orders/${codOrderId}`);
    await expect(page.getByRole("button", { name: "Anulează comanda" })).toHaveCount(0);
  });

  test("dashboard afișează comenzile noi", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto("/admin");
    await expect(page.getByTestId("admin-operations-dashboard")).toContainText(newPublicNumber);
  });

  test("dashboard calculează stocul efectiv cu rezervarea activă", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto("/admin");
    const lowStockLink = page.getByRole("link", { name: new RegExp(`Produs stoc 7C ${namespace}`) });
    await expect(lowStockLink).toBeVisible();
    await expect(lowStockLink).toContainText("Disponibil 2 · fizic 5 · rezervat 3 · prag 3");
  });

  test("dashboard afișează review-urile de personalizare", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto("/admin");
    await expect(page.getByTestId("admin-operations-dashboard")).toContainText(customPublicNumber);
  });

  test("shipped arată tracking și notificarea asociată", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto(`/admin/orders/${shippedOrderId}`);
    await expect(page.getByText(`SHIP-${namespace}`, { exact: true })).toBeVisible();
    await expect(page.getByTestId("notification-history")).toContainText("Expediată");
    await expect(page.getByTestId("notification-history")).toContainText("sent");
  });

  test("fixture-ul COD folosește public number real", () => {
    expect(codPublicNumber).toMatch(/^CMD-\d{4}-\d{8}$/);
  });
});

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Parolă").fill(password);
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}
