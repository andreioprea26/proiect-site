import { expect, test, type Locator, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const e2eEmail = process.env.E2E_TEST_EMAIL ?? "";
const e2ePassword = process.env.E2E_TEST_PASSWORD ?? "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const hasE2eConfiguration = Boolean(
  e2eEmail && e2ePassword && supabaseUrl && supabasePublishableKey,
);

type ProfileSnapshot = {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};

test.describe("cont client autentificat", () => {
  test.skip(
    !hasE2eConfiguration,
    "Necesită E2E_TEST_EMAIL și E2E_TEST_PASSWORD în .env.local.",
  );

  test("profil, CRUD adrese, adresă implicită și logout", async ({ page }) => {
    test.setTimeout(90_000);

    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const addressPrefix = `E2E ${runId}`;
    let originalProfile: ProfileSnapshot | null = null;

    try {
      await login(page);

      await page.goto("/account");
      await expect(page).toHaveURL(/\/account$/);
      await expect(
        page.getByRole("heading", { level: 1, name: "Contul meu" }),
      ).toBeVisible();
      await expect(page.getByText(e2eEmail, { exact: true })).toBeVisible();

      await page.goto("/account/profile");
      await expect(
        page.getByRole("heading", { level: 1, name: "Profilul meu" }),
      ).toBeVisible();
      await expect(page.getByLabel("E-mail")).toHaveValue(e2eEmail);
      await expect(page.getByLabel("E-mail")).toHaveAttribute("readonly", "");

      const firstName = page.getByLabel("Prenume");
      const lastName = page.getByLabel("Nume", { exact: true });
      const phone = page.getByLabel("Telefon");
      originalProfile = {
        firstName: (await firstName.inputValue()) || null,
        lastName: (await lastName.inputValue()) || null,
        phone: (await phone.inputValue()) || null,
      };

      await firstName.fill(`Test-${runId.slice(-6)}`);
      await lastName.fill("E2E");
      await phone.fill("0700000000");
      await page.getByRole("button", { name: "Salvează profilul" }).click();
      await expect(page.getByText("Profilul a fost actualizat.")).toBeVisible();

      await page.reload();
      await expect(firstName).toHaveValue(`Test-${runId.slice(-6)}`);
      await expect(lastName).toHaveValue("E2E");
      await expect(phone).toHaveValue("0700000000");

      await firstName.fill(originalProfile.firstName ?? "");
      await lastName.fill(originalProfile.lastName ?? "");
      await phone.fill(originalProfile.phone ?? "");
      await page.getByRole("button", { name: "Salvează profilul" }).click();
      await expect(page.getByText("Profilul a fost actualizat.")).toBeVisible();

      await page.goto("/account/addresses");
      await expect(
        page.getByRole("heading", { level: 1, name: "Adresele mele" }),
      ).toBeVisible();

      const newAddressForm = page
        .getByRole("heading", { name: "Adresă nouă" })
        .locator("..")
        .locator("form");
      const addressA = `${addressPrefix} A`;
      const addressB = `${addressPrefix} B`;

      await fillAddressForm(newAddressForm, addressA, "București");
      await newAddressForm.getByLabel("Adresă implicită").check();
      await newAddressForm
        .getByRole("button", { name: "Adaugă adresa" })
        .click();
      await expect(page.getByText("Adresa a fost adăugată.")).toBeVisible();
      await expect(addressArticle(page, addressA)).toContainText("Implicită");

      await fillAddressForm(newAddressForm, addressB, "Brașov");
      await newAddressForm.getByLabel("Adresă implicită").check();
      await newAddressForm
        .getByRole("button", { name: "Adaugă adresa" })
        .click();
      await expect(page.getByText("Adresa a fost adăugată.")).toBeVisible();
      await expect(addressArticle(page, addressB)).toContainText("Implicită");
      await expect(
        addressArticle(page, addressA).getByText("Implicită", { exact: true }),
      ).toHaveCount(0);

      let articleA = addressArticle(page, addressA);
      const editFormA = articleA.locator("form").first();
      await editFormA.locator('[name="city"]').fill("Cluj-Napoca");
      await submitServerAction(
        page,
        editFormA.getByRole("button", { name: "Salvează adresa" }),
      );
      await page.reload();
      articleA = addressArticle(page, addressA);
      await expect(articleA.locator('[name="city"]')).toHaveValue(
        "Cluj-Napoca",
      );

      const defaultCheckboxA = articleA.getByLabel("Adresă implicită");
      const saveAddressA = articleA.getByRole("button", {
        name: "Salvează adresa",
      });
      await defaultCheckboxA.check();
      await expect(defaultCheckboxA).toBeChecked();
      await submitServerAction(page, saveAddressA);
      await page.reload();
      await expect(addressArticle(page, addressA)).toContainText("Implicită");
      await expect(
        addressArticle(page, addressB).getByText("Implicită", { exact: true }),
      ).toHaveCount(0);

      await addressArticle(page, addressA)
        .getByRole("button", { name: "Șterge adresa" })
        .click();
      await expect(addressArticle(page, addressA)).toHaveCount(0);

      await addressArticle(page, addressB)
        .getByRole("button", { name: "Șterge adresa" })
        .click();
      await expect(addressArticle(page, addressB)).toHaveCount(0);

      await page.getByRole("button", { name: "Deconectare" }).click();
      await expect(page).toHaveURL(/\/$/);
      await page.goto("/account");
      await expect(page).toHaveURL(/\/login$/);
    } finally {
      await cleanupTestData(addressPrefix, originalProfile);
    }
  });
});

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(e2eEmail);
  await page.getByLabel("Parolă").fill(e2ePassword);
  await page.getByRole("button", { name: "Autentificare" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function fillAddressForm(
  form: Locator,
  label: string,
  city: string,
) {
  await form.locator('[name="label"]').fill(label);
  await form.locator('[name="recipientName"]').fill("Client E2E");
  await form.locator('[name="phone"]').fill("0700000000");
  await form.locator('[name="addressLine1"]').fill("Strada Test 10");
  await form.locator('[name="addressLine2"]').fill("Apartament test");
  await form.locator('[name="city"]').fill(city);
  await form.locator('[name="county"]').fill("Județ Test");
  await form.locator('[name="postalCode"]').fill("010101");
  await form.locator('[name="countryCode"]').fill("RO");
}

function addressArticle(page: Page, label: string) {
  return page.locator("article").filter({ hasText: label });
}

async function submitServerAction(page: Page, button: Locator) {
  const currentPath = new URL(page.url()).pathname;
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === currentPath,
  );

  await button.click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
}

async function cleanupTestData(
  addressPrefix: string,
  profile: ProfileSnapshot | null,
) {
  if (!hasE2eConfiguration) return;

  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const { data, error: loginError } = await supabase.auth.signInWithPassword({
    email: e2eEmail,
    password: e2ePassword,
  });

  if (loginError || !data.user) {
    throw new Error("Curățarea E2E nu s-a putut autentifica.");
  }

  const { error: addressError } = await supabase
    .from("customer_addresses")
    .delete()
    .like("label", `${addressPrefix}%`);
  if (addressError) {
    throw new Error("Adresele E2E nu au putut fi curățate.");
  }

  if (profile) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
      })
      .eq("id", data.user.id);
    if (profileError) {
      throw new Error("Profilul E2E nu a putut fi restaurat.");
    }
  }

  await supabase.auth.signOut({ scope: "local" });
}
