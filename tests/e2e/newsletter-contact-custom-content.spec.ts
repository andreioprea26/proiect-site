import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "";
const configured = Boolean(supabaseUrl && publishableKey && serviceRoleKey && adminEmail && adminPassword);

test.describe.serial("Faza 8B — newsletter, contact, cereri și conținut", () => {
  const namespace = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `client-8b-${namespace}@example.com`;
  const draftSlug = `draft-8b-${namespace}`;
  const publishedSlug = `publicat-8b-${namespace}`;
  const contactMessage = `Mesaj contact Faza 8B ${namespace}, suficient de lung pentru validare.`;
  const customDescription = `Cerere personalizată Faza 8B ${namespace}: decorațiune albastră pentru aniversare.`;
  let schemaReady = false;
  let service: SupabaseClient;

  test.beforeAll(async () => {
    test.skip(!configured, "Necesită Supabase Development și contul admin E2E.");
    service = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const [tableProbe, newsletterProbe] = await Promise.all([
      service.from("content_pages").select("id", { head: true, count: "exact" }),
      service.rpc("subscribe_newsletter", { p_email: `probe-${namespace}@example.com`, p_source: "footer" }),
    ]);
    schemaReady = !tableProbe.error && !newsletterProbe.error;
    if (!schemaReady) return;
    await service.from("newsletter_subscribers").delete().eq("email", `probe-${namespace}@example.com`);
    const { error } = await service.from("content_pages").insert([
      { slug: draftSlug, title: `Draft Faza 8B ${namespace}`, content: "Acest conținut trebuie să rămână privat.", status: "draft", published_at: null },
      { slug: publishedSlug, title: `Informații Faza 8B ${namespace}`, content: "Conținut public sigur, randat ca text simplu.", status: "published", published_at: new Date().toISOString() },
    ]);
    if (error) throw error;
  });

  test.afterAll(async () => {
    if (!schemaReady || !service) return;
    await service.from("newsletter_subscribers").delete().eq("email", email);
    await service.from("contact_requests").delete().eq("email", email);
    await service.from("custom_order_requests").delete().eq("email", email);
    await service.from("content_pages").delete().in("slug", [draftSlug, publishedSlug]);
  });

  test("newsletter subscribe este normalizat și idempotent", async ({ page }) => {
    test.skip(!schemaReady, "Migrarea 8B trebuie aplicată în Development.");
    await page.goto("/");
    const input = page.getByLabel("Newsletter");
    await input.fill(`  ${email.toUpperCase()}  `);
    await page.getByRole("button", { name: "Mă abonez" }).click();
    await expect(page.getByText("Dacă adresa este eligibilă, abonarea a fost înregistrată.")).toBeVisible();
    await input.fill(email);
    await page.getByRole("button", { name: "Mă abonez" }).click();
    await expect.poll(async () => (await service.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("email", email)).count).toBe(1);
  });

  test("guest trimite formularul de contact", async ({ page }) => {
    test.skip(!schemaReady, "Migrarea 8B trebuie aplicată în Development.");
    await page.goto("/contact");
    await page.getByLabel("Nume").fill("Client Test 8B");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Categorie").selectOption("general");
    await page.getByLabel("Mesaj").fill(contactMessage);
    await page.waitForTimeout(850);
    await page.getByRole("button", { name: "Trimite mesajul" }).click();
    await expect(page.getByText("Mesajul a fost înregistrat. Îți vom răspunde folosind adresa furnizată.")).toBeVisible();
  });

  test("guest trimite doar un lead de cerere personalizată", async ({ page }) => {
    test.skip(!schemaReady, "Migrarea 8B trebuie aplicată în Development.");
    await page.goto("/custom-orders");
    await page.getByLabel("Nume").fill("Client Test 8B");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Descrierea cererii").fill(customDescription);
    await page.getByLabel("Buget orientativ (RON, opțional)").fill("250");
    await page.waitForTimeout(850);
    await page.getByRole("button", { name: "Trimite cererea" }).click();
    await expect(page.getByText("Cererea a fost înregistrată pentru analiză. Nu a fost creată nicio comandă sau plată.")).toBeVisible();
    await expect.poll(async () => (await service.from("orders").select("id", { count: "exact", head: true }).eq("email", email)).count).toBe(0);
  });

  test("adminul vede și gestionează newsletter, contact și cererea", async ({ page }) => {
    test.skip(!schemaReady, "Migrarea 8B trebuie aplicată în Development.");
    await login(page, adminEmail, adminPassword);
    await page.goto("/admin/newsletter");
    const subscriber = page.locator("article").filter({ hasText: email });
    await expect(subscriber).toBeVisible();
    await subscriber.getByRole("button", { name: "Dezactivează" }).click();
    await expect.poll(async () => (await service.from("newsletter_subscribers").select("is_active").eq("email", email).single()).data?.is_active).toBe(false);

    await page.goto("/admin/contact");
    const contact = page.locator("article").filter({ hasText: contactMessage });
    await expect(contact).toBeVisible();
    await contact.getByLabel("Status").selectOption("in_progress");
    await contact.getByLabel("Notă internă").fill("Notă internă 8B contact");
    await contact.getByRole("button", { name: "Salvează mesajul" }).click();
    await expect.poll(async () => (await service.from("contact_requests").select("status, internal_note").eq("email", email).single()).data).toMatchObject({ status: "in_progress", internal_note: "Notă internă 8B contact" });

    await page.goto("/admin/custom-requests");
    const custom = page.locator("article").filter({ hasText: customDescription });
    await expect(custom).toBeVisible();
    await custom.getByLabel("Status").selectOption("reviewing");
    await custom.getByLabel("Notă internă").fill("Notă internă 8B cerere");
    await custom.getByRole("button", { name: "Salvează cererea" }).click();
    await expect.poll(async () => (await service.from("custom_order_requests").select("status, internal_note").eq("email", email).single()).data).toMatchObject({ status: "reviewing", internal_note: "Notă internă 8B cerere" });
  });

  test("pagina draft nu este publică", async ({ page }) => {
    test.skip(!schemaReady, "Migrarea 8B trebuie aplicată în Development.");
    await page.context().clearCookies();
    await page.goto(`/info/${draftSlug}`);
    await expect(page.getByText("This page could not be found")).toBeVisible();
  });

  test("pagina publicată este vizibilă și randată sigur", async ({ page }) => {
    test.skip(!schemaReady, "Migrarea 8B trebuie aplicată în Development.");
    await page.context().clearCookies();
    await page.goto(`/info/${publishedSlug}`);
    await expect(page.getByRole("heading", { name: `Informații Faza 8B ${namespace}` })).toBeVisible();
    await expect(page.getByText("Conținut public sigur, randat ca text simplu.")).toBeVisible();
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
