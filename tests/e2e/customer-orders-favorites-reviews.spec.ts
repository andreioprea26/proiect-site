import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "";
const configured = Boolean(supabaseUrl && publishableKey && serviceRoleKey && adminEmail && adminPassword);

test.describe.serial("Faza 8A — cont, favorite și recenzii", () => {
  const namespace = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const customerAEmail = `customer-a-8a-${namespace}@example.com`;
  const customerBEmail = `customer-b-8a-${namespace}@example.com`;
  const password = `T8a-${namespace}-Secure!`;
  const productId = crypto.randomUUID();
  const productSlug = `produs-8a-${namespace}`;
  const shippingId = crypto.randomUUID();
  const orderAId = crypto.randomUUID();
  const orderBId = crypto.randomUUID();
  let customerAId = "";
  let customerBId = "";
  let orderAPublicNumber = "";
  let schemaReady = false;
  let service: SupabaseClient;

  test.beforeAll(async () => {
    test.skip(!configured, "Necesită Supabase Development și contul admin E2E.");
    service = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const [tableProbe, publicRpcProbe, eligibilityRpcProbe] = await Promise.all([
      service.from("reviews").select("id", { head: true, count: "exact" }),
      service.rpc("get_approved_product_reviews", { p_product_id: crypto.randomUUID() }),
      service.rpc("can_review_product", { p_product_id: crypto.randomUUID() }),
    ]);
    schemaReady = !tableProbe.error && !publicRpcProbe.error && !eligibilityRpcProbe.error;
    if (!schemaReady) return;

    const [createdA, createdB] = await Promise.all([
      service.auth.admin.createUser({ email: customerAEmail, password, email_confirm: true }),
      service.auth.admin.createUser({ email: customerBEmail, password, email_confirm: true }),
    ]);
    if (createdA.error || !createdA.data.user) throw createdA.error ?? new Error("Customer A lipsește.");
    if (createdB.error || !createdB.data.user) throw createdB.error ?? new Error("Customer B lipsește.");
    customerAId = createdA.data.user.id;
    customerBId = createdB.data.user.id;

    const product = await service.from("products").insert({
      id: productId, name: `Produs Faza 8A ${namespace}`, slug: productSlug,
      description: "Produs publicat pentru verificarea funcțiilor Fazei 8A.",
      base_price: 75, product_type: "standard", publication_status: "published",
      availability_status: "in_stock", is_customizable: false,
    });
    if (product.error) throw product.error;
    const shipping = await service.from("shipping_methods").insert({
      id: shippingId, code: `curier-8a-${namespace}`, name: "Curier test 8A",
      price_minor: 1500, is_active: false,
    });
    if (shipping.error) throw shipping.error;
    const address = { recipientName: "Client 8A", phone: "0700000000", addressLine1: "Strada Snapshot 8A", city: "Brașov", county: "Brașov", postalCode: "500001", countryCode: "RO" };
    const common = {
      request_fingerprint: {}, phone: "0700000000", customer_type: "individual",
      shipping_address: address, billing_address: address, shipping_method_id: shippingId,
      shipping_method_code: `curier-8a-${namespace}`, shipping_method_name: "Curier test 8A",
      subtotal_minor: 7500, shipping_minor: 1500, total_minor: 9000, currency: "RON",
    };
    const orders = await service.from("orders").insert([
      { ...common, id: orderAId, idempotency_key: crypto.randomUUID(), user_id: customerAId, email: customerAEmail, payment_method: "card", payment_status: "paid", status: "completed" },
      { ...common, id: orderBId, idempotency_key: crypto.randomUUID(), user_id: customerBId, email: customerBEmail, payment_method: "card", payment_status: "pending", status: "awaiting_payment" },
    ]).select("id, public_number");
    if (orders.error) throw orders.error;
    orderAPublicNumber = orders.data.find((order) => order.id === orderAId)?.public_number ?? "";
    const items = await service.from("order_items").insert({
      order_id: orderAId, product_id: productId, product_name: `Snapshot Faza 8A ${namespace}`,
      product_slug: productSlug, variant_snapshot: { title: "Varianta istorică", attributes: { culoare: "Verde" } },
      customizations_snapshot: [{ name: "Mesaj", displayValue: "Pentru tine" }],
      unit_base_price_minor: 7500, customization_total_minor: 0,
      unit_price_minor: 7500, quantity: 1, line_subtotal_minor: 7500,
    });
    if (items.error) throw items.error;
    const shipment = await service.from("shipments").insert({
      order_id: orderAId, carrier: "Curier test", tracking_number: `AWB-${namespace}`,
      tracking_url: `https://example.com/tracking/${namespace}`, shipped_at: new Date().toISOString(),
    });
    if (shipment.error) throw shipment.error;
  });

  test.afterAll(async () => {
    if (!schemaReady || !service) return;
    const reviews = await service.from("reviews").select("id").eq("product_id", productId);
    if (!reviews.error && reviews.data.length) {
      await service.from("review_moderation_events").delete().in("review_id", reviews.data.map((review) => review.id));
    }
    await service.from("reviews").delete().eq("product_id", productId);
    await service.from("favorites").delete().eq("product_id", productId);
    await service.from("orders").delete().in("id", [orderAId, orderBId]);
    await service.from("shipping_methods").delete().eq("id", shippingId);
    await service.from("products").delete().eq("id", productId);
    if (customerAId) await service.auth.admin.deleteUser(customerAId);
    if (customerBId) await service.auth.admin.deleteUser(customerBId);
  });

  test("clientul vede doar istoricul propriu și snapshot-ul detaliat", async ({ page }) => {
    test.skip(!schemaReady, "Migrarea 8A trebuie aplicată manual în Development.");
    await login(page, customerAEmail, password);
    await page.goto("/account/orders");
    await expect(page.getByText(orderAPublicNumber)).toBeVisible();
    await expect(page.getByText(customerBEmail)).toHaveCount(0);
    await page.getByRole("link", { name: "Detalii" }).click();
    await expect(page.getByRole("heading", { name: `Comanda ${orderAPublicNumber}` })).toBeVisible();
    await expect(page.getByText(`Snapshot Faza 8A ${namespace}`)).toBeVisible();
    await expect(page.getByText("Varianta istorică · culoare: Verde")).toBeVisible();
    await expect(page.getByText("Mesaj: Pentru tine")).toBeVisible();
    await expect(page.getByText(`AWB-${namespace}`)).toBeVisible();
    await page.goto(`/account/orders/${orderBId}`);
    await expect(page.getByText("This page could not be found")).toBeVisible();
  });

  test("favoritele au add/remove/dedupe și sunt separate între utilizatori", async ({ page }) => {
    test.skip(!schemaReady, "Migrarea 8A trebuie aplicată manual în Development.");
    await login(page, customerAEmail, password);
    await page.goto(`/products/${productSlug}`);
    await page.getByRole("button", { name: "♡ Adaugă la favorite" }).click();
    await expect(page.getByRole("button", { name: "♥ În favorite" })).toBeVisible();
    await page.goto("/account/favorites");
    await expect(page.getByText(`Produs Faza 8A ${namespace}`)).toBeVisible();
    const { count } = await service.from("favorites").select("product_id", { count: "exact", head: true }).eq("user_id", customerAId).eq("product_id", productId);
    expect(count).toBe(1);
    await page.getByRole("button", { name: "♥ În favorite" }).click();
    await expect(page.getByText("Nu ai încă produse favorite.")).toBeVisible();
    await service.from("favorites").insert({ user_id: customerAId, product_id: productId });
    await login(page, customerBEmail, password);
    await page.goto("/account/favorites");
    await expect(page.getByText("Nu ai încă produse favorite.")).toBeVisible();
  });

  test("review-ul eligibil rămâne privat până la aprobarea admin", async ({ page }) => {
    test.skip(!schemaReady, "Migrarea 8A trebuie aplicată manual în Development.");
    const reviewText = `Recenzie verificată Faza 8A ${namespace}`;
    await login(page, customerAEmail, password);
    await page.goto(`/products/${productSlug}`);
    await page.getByLabel("Recenzia ta").fill(reviewText);
    await page.getByRole("button", { name: "Trimite recenzia" }).click();
    await expect(page.getByText("Ai trimis deja o recenzie pentru acest produs. Status: în așteptarea moderării.")).toBeVisible();

    const ineligible = createClient(supabaseUrl, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    await ineligible.auth.signInWithPassword({ email: customerBEmail, password });
    const rejected = await ineligible.rpc("submit_verified_review", { p_product_id: productId, p_rating: 5, p_review_text: "Nu am o achiziție eligibilă pentru acest produs." });
    expect(rejected.error).toBeNull();
    expect(rejected.data).toMatchObject({ success: false, code: "not_eligible" });
    await ineligible.auth.signOut({ scope: "local" });

    await page.context().clearCookies();
    await page.goto(`/products/${productSlug}`);
    await expect(page.getByText(reviewText)).toHaveCount(0);
    await login(page, adminEmail, adminPassword);
    await page.goto("/admin/reviews?status=pending");
    const review = page.locator("article").filter({ hasText: reviewText });
    await expect(review).toBeVisible();
    await review.getByRole("button", { name: "Aprobă" }).click();
    await expect(review).toHaveCount(0);
    await page.context().clearCookies();
    await page.goto(`/products/${productSlug}`);
    await expect(page.getByText(reviewText)).toBeVisible();
    await expect(page.getByText("Achiziție verificată")).toBeVisible();
    await expect(page.getByText(customerAEmail)).toHaveCount(0);
  });
});

async function login(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Parolă").fill(password);
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}
