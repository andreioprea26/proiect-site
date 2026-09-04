import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const configured = Boolean(supabaseUrl && publishableKey && serviceRoleKey);

test.describe.serial("Faza 9A — security și data integrity", () => {
  const namespace = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const customerEmail = `customer-9a-${namespace}@example.com`;
  const password = `T9a-${namespace}-Secure!`;
  let service: SupabaseClient;
  let customer: SupabaseClient;
  let customerId = "";

  test.beforeAll(async () => {
    if (!configured) {
      throw new Error(
        "Suita 9A necesită configurația Supabase Development și service-role E2E.",
      );
    }
    service = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    customer = createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const created = await service.auth.admin.createUser({
      email: customerEmail,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("Clientul izolat 9A nu a putut fi creat.");
    }
    customerId = created.data.user.id;
    const login = await customer.auth.signInWithPassword({ email: customerEmail, password });
    if (login.error) throw login.error;
  });

  test.afterAll(async () => {
    await customer?.auth.signOut({ scope: "local" });
    if (customerId) await service?.auth.admin.deleteUser(customerId);
  });

  test("anon nu poate lista PII din conturi și formulare", async () => {
    const anon = createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    for (const table of [
      "profiles",
      "customer_addresses",
      "newsletter_subscribers",
      "contact_requests",
      "custom_order_requests",
    ]) {
      const result = await anon.from(table).select("*", { count: "exact", head: true });
      expect(result.error, `${table} trebuie să refuze anon`).not.toBeNull();
    }
  });

  test("anon nu poate apela RPC-uri administrative sau generatorul de comenzi", async () => {
    const anon = createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const adminRpc = await anon.rpc("manage_newsletter_subscription", {
      p_id: crypto.randomUUID(),
      p_active: false,
    });
    expect(adminRpc.error).not.toBeNull();

    const orderNumber = await anon.rpc("next_order_public_number");
    expect(orderNumber.error).not.toBeNull();
  });

  test("customer rămâne izolat și nu își poate acorda rol admin", async () => {
    const ownProfile = await customer.from("profiles").select("id").eq("id", customerId);
    expect(ownProfile.error).toBeNull();
    expect(ownProfile.data).toEqual([{ id: customerId }]);

    const roleEscalation = await customer.from("user_roles").insert({
      user_id: customerId,
      role: "admin",
    });
    expect(roleEscalation.error).not.toBeNull();

    const orderNumber = await customer.rpc("next_order_public_number");
    expect(orderNumber.error).not.toBeNull();
  });
});
