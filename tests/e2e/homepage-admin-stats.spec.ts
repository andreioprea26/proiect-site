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

test.describe.serial("8C homepage administrabil și statistici", () => {
  test.skip(!hasIntegration, "Necesită credențialele E2E și Supabase Development.");

  const namespace = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const shippingId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const paidOrderId = crypto.randomUUID();
  const pendingOrderId = crypto.randomUUID();
  const codOrderId = crypto.randomUUID();
  const paidPaymentId = crypto.randomUUID();
  const pendingPaymentId = crypto.randomUUID();
  const contactEmail = `contact-8c-${namespace}@example.com`;
  const customEmail = `custom-8c-${namespace}@example.com`;
  const newsletterEmail = `newsletter-8c-${namespace}@example.com`;
  let service: SupabaseClient;
  let adminAuth: SupabaseClient;
  let customerAuth: SupabaseClient;
  let anonAuth: SupabaseClient;
  let originalBlocks: Array<Record<string, unknown>> = [];

  test.beforeAll(async () => {
    service = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    adminAuth = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
    customerAuth = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
    anonAuth = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const adminLogin = await adminAuth.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    if (adminLogin.error) throw adminLogin.error;
    const customerLogin = await customerAuth.auth.signInWithPassword({ email: customerEmail, password: customerPassword });
    if (customerLogin.error) throw customerLogin.error;

    const existing = await service.from("homepage_blocks").select("*").in("slot", ["hero", "promo"]);
    if (existing.error) throw new Error(`Migrarea 8C nu este disponibilă: ${existing.error.message}`);
    originalBlocks = existing.data ?? [];
    const clear = await service.from("homepage_blocks").delete().in("slot", ["hero", "promo"]);
    if (clear.error) throw clear.error;

    await removeFixtures();
    await createStatsFixtures();
  });

  test.afterAll(async () => {
    if (!service) return;
    await removeFixtures();
    await service.from("homepage_blocks").delete().in("slot", ["hero", "promo"]);
    if (originalBlocks.length > 0) await service.from("homepage_blocks").upsert(originalBlocks);
    await adminAuth?.auth.signOut({ scope: "local" });
    await customerAuth?.auth.signOut({ scope: "local" });
  });

  test("homepage-ul folosește fallback-ul când slotul nu este configurat", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Obiecte handmade pentru gesturi care rămân." })).toBeVisible();
  });

  test("anon și customer nu pot accesa administrarea", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin/homepage");
    await expect(page).toHaveURL(/\/login/);
    await login(page, customerEmail, customerPassword);
    await page.goto("/admin/homepage");
    await expect(page).toHaveURL(/\/$/);
  });

  test("customer nu poate modifica homepage-ul sau citi statisticile", async () => {
    const homepage = await customerAuth.rpc("upsert_homepage_block", {
      p_slot: "hero", p_eyebrow: "Atac", p_title: "Atac client", p_subtitle: null,
      p_cta_label: null, p_cta_href: null, p_is_active: true, p_display_order: 0,
    });
    expect(homepage.error).toBeNull();
    expect(homepage.data).toMatchObject({ success: false, code: "unauthorized" });
    const stats = await customerAuth.rpc("get_admin_dashboard_stats", { p_since: new Date(0).toISOString() });
    expect(stats.error).toBeNull();
    expect(stats.data).toMatchObject({ success: false, code: "unauthorized" });
    const anonStats = await anonAuth.rpc("get_admin_dashboard_stats", { p_since: new Date(0).toISOString() });
    expect(anonStats.error).not.toBeNull();
  });

  test("adminul modifică hero-ul, iar storefront-ul reflectă salvarea", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto("/admin/homepage");
    const hero = page.locator("form").filter({ hasText: "Hero principal" });
    await hero.locator('[name="eyebrow"]').fill("Atelier administrabil 8C");
    await hero.locator('[name="title"]').fill(`Hero public 8C ${namespace}`);
    await hero.locator('[name="subtitle"]').fill("Conținut salvat sigur, fără HTML arbitrar.");
    await hero.locator('[name="ctaLabel"]').fill("Vezi produsele");
    await hero.locator('[name="ctaHref"]').fill("/shop?source=homepage-8c");
    await hero.getByRole("button", { name: "Salvează blocul" }).click();
    await expect(hero.getByRole("status")).toContainText("Blocul a fost salvat");
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: `Hero public 8C ${namespace}` })).toBeVisible();
    await expect(page.getByRole("link", { name: "Vezi produsele", exact: true })).toHaveAttribute("href", "/shop?source=homepage-8c");
  });

  test("adminul poate activa și dezactiva bannerul promoțional", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await page.goto("/admin/homepage");
    const promo = page.locator("form").filter({ hasText: "Banner promoțional" });
    await promo.locator('[name="title"]').fill(`Promo 8C ${namespace}`);
    await promo.locator('[name="isActive"]').check();
    await promo.getByRole("button", { name: "Salvează blocul" }).click();
    await expect(promo.getByRole("status")).toContainText("Blocul a fost salvat");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: `Promo 8C ${namespace}` })).toBeVisible();
    await page.goto("/admin/homepage");
    const updatedPromo = page.locator("form").filter({ hasText: "Banner promoțional" });
    await updatedPromo.locator('[name="isActive"]').uncheck();
    await updatedPromo.getByRole("button", { name: "Salvează blocul" }).click();
    await expect(updatedPromo.getByRole("status")).toContainText("Blocul a fost salvat");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: `Promo 8C ${namespace}` })).toHaveCount(0);
  });

  test("dashboard-ul afișează agregările financiare și operaționale exacte", async ({ page }) => {
    await login(page, adminEmail, adminPassword);
    await expect(async () => {
      const current = await adminAuth.rpc("get_admin_dashboard_stats", {
        p_since: new Date(Date.now() - 30 * 86400000).toISOString(),
      });
      if (current.error || !(current.data as { success?: boolean } | null)?.success) {
        throw current.error ?? new Error("Statisticile 8C nu au putut fi calculate.");
      }
      const expectedStats = current.data as Record<string, unknown>;
      await page.goto("/admin");
      await expect(page.getByTestId("admin-statistics-dashboard")).toBeVisible();
      await expectMetric(page, "recent-orders", Number(expectedStats.recentOrderCount));
      await expectMetric(page, "attention-orders", Number(expectedStats.attentionOrderCount));
      await expectMetric(page, "pending-reviews", Number(expectedStats.pendingReviewCount));
      await expectMetric(page, "new-contacts", Number(expectedStats.newContactCount));
      await expectMetric(page, "new-custom-requests", Number(expectedStats.newCustomRequestCount));
      await expectMoneyMetric(page, "stripe-gross", Number(expectedStats.stripeCollectedGrossMinor));
      await expectMoneyMetric(page, "cod-collected", Number(expectedStats.codCollectedMinor));
      await expectMoneyMetric(page, "refunds", Number(expectedStats.successfulRefundsMinor));
      await expectMoneyMetric(page, "stripe-net", Number(expectedStats.stripeCollectedNetMinor));
    }).toPass({ intervals: [250, 500, 1_000], timeout: 10_000 });
  });

  async function createStatsFixtures() {
    const shipping = await service.from("shipping_methods").insert({ id: shippingId, code: `stats-8c-${namespace}`, name: `Curier Stats 8C ${namespace}`, price_minor: 0, is_active: false });
    if (shipping.error) throw shipping.error;
    const product = await service.from("products").insert({ id: productId, name: `Produs Stats 8C ${namespace}`, slug: `produs-stats-8c-${namespace}`, base_price: 100, product_type: "standard", publication_status: "draft", availability_status: "in_stock" });
    if (product.error) throw product.error;
    const common = { request_fingerprint: {}, phone: "0700000000", customer_type: "individual", shipping_address: {}, billing_address: {}, shipping_method_id: shippingId, shipping_method_code: `stats-8c-${namespace}`, shipping_method_name: `Curier Stats 8C ${namespace}`, shipping_minor: 0, currency: "RON" };
    const orders = await service.from("orders").insert([
      { ...common, id: paidOrderId, idempotency_key: crypto.randomUUID(), email: `paid-8c-${namespace}@example.com`, payment_method: "card", payment_status: "paid", status: "paid", subtotal_minor: 10000, total_minor: 10000 },
      { ...common, id: pendingOrderId, idempotency_key: crypto.randomUUID(), email: `pending-8c-${namespace}@example.com`, payment_method: "card", payment_status: "pending", status: "awaiting_payment", subtotal_minor: 7000, total_minor: 7000 },
      { ...common, id: codOrderId, idempotency_key: crypto.randomUUID(), email: `cod-8c-${namespace}@example.com`, payment_method: "cash_on_delivery", payment_status: "paid", status: "shipped", subtotal_minor: 5000, total_minor: 5000 },
    ]);
    if (orders.error) throw orders.error;
    const payments = await service.from("payments").insert([
      { id: paidPaymentId, order_id: paidOrderId, provider: "stripe", status: "paid", amount_minor: 10000, currency: "RON", idempotency_key: crypto.randomUUID(), pending_expires_at: new Date(Date.now() + 3600000).toISOString(), provider_payment_id: `pi_8c_${namespace}`, paid_at: new Date().toISOString() },
      { id: pendingPaymentId, order_id: pendingOrderId, provider: "stripe", status: "pending", amount_minor: 7000, currency: "RON", idempotency_key: crypto.randomUUID(), pending_expires_at: new Date(Date.now() + 3600000).toISOString() },
    ]);
    if (payments.error) throw payments.error;
    const refund = await service.from("payment_refunds").insert({ payment_id: paidPaymentId, provider_refund_id: `re_8c_${namespace}`, provider_payment_intent_id: `pi_8c_${namespace}`, amount_minor: 2000, currency: "RON", status: "succeeded", idempotency_key: `refund-8c-${namespace}`, succeeded_at: new Date().toISOString() });
    if (refund.error) throw refund.error;
    const collection = await service.from("cod_collections").update({ status: "collected", collected_at: new Date().toISOString(), collected_by: (await adminAuth.auth.getUser()).data.user?.id, collection_request_id: crypto.randomUUID() }).eq("order_id", codOrderId);
    if (collection.error) throw collection.error;
    const review = await service.from("reviews").insert({ product_id: productId, user_id: (await adminAuth.auth.getUser()).data.user?.id, rating: 5, review_text: `Review pending 8C ${namespace}`, verified_purchase: true, status: "pending", author_display_name: "Admin 8C" });
    if (review.error) throw review.error;
    const contact = await service.from("contact_requests").insert({ name: "Client 8C", email: contactEmail, category: "general", message: `Mesaj contact 8C suficient de lung ${namespace}.`, submission_key: `contact-${namespace}` });
    if (contact.error) throw contact.error;
    const custom = await service.from("custom_order_requests").insert({ name: "Client 8C", email: customEmail, description: `Descriere personalizată 8C suficient de lungă ${namespace}.`, submission_key: `custom-${namespace}` });
    if (custom.error) throw custom.error;
    const newsletter = await service.from("newsletter_subscribers").insert({ email: newsletterEmail, source: "homepage" });
    if (newsletter.error) throw newsletter.error;
  }

  async function removeFixtures() {
    await service.from("reviews").delete().eq("product_id", productId);
    await service.from("payment_refunds").delete().eq("payment_id", paidPaymentId);
    await service.from("orders").delete().in("id", [paidOrderId, pendingOrderId, codOrderId]);
    await service.from("products").delete().eq("id", productId);
    await service.from("shipping_methods").delete().eq("id", shippingId);
    await service.from("contact_requests").delete().eq("email", contactEmail);
    await service.from("custom_order_requests").delete().eq("email", customEmail);
    await service.from("newsletter_subscribers").delete().eq("email", newsletterEmail);
  }
});

async function login(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Parolă").fill(password);
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
}

async function expectMetric(page: Page, id: string, value: number) {
  await expect(page.locator(`[data-metric="${id}"] p`).last()).toHaveText(String(value));
}

async function expectMoneyMetric(page: Page, id: string, value: number) {
  await expect(page.locator(`[data-metric="${id}"] p`).last()).toHaveText(formatMoney(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(value / 100);
}
