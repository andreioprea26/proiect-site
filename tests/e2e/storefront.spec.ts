import { expect, type APIRequestContext, test } from "@playwright/test";

type PublicProduct = {
  name: string;
  slug: string;
  publication_status: string;
};

type PublicTaxonomy = {
  name: string;
  slug: string;
};

function getPublicSupabaseSettings() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Supabase public environment variables are required for E2E tests.");
  }
  return { url, publishableKey };
}

async function readPublicRows<T>(
  request: APIRequestContext,
  table: string,
  query: Record<string, string>,
) {
  const { url, publishableKey } = getPublicSupabaseSettings();
  const endpoint = new URL(`/rest/v1/${table}`, url);
  Object.entries(query).forEach(([key, value]) =>
    endpoint.searchParams.set(key, value),
  );

  const response = await request.get(endpoint.toString(), {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as T[];
}

test("pagina Magazin se încarcă și folosește catalogul public", async ({
  page,
  request,
}) => {
  const products = await readPublicRows<PublicProduct>(request, "products", {
    select: "name,slug,publication_status",
    publication_status: "eq.published",
    order: "created_at.desc",
  });

  const response = await page.goto("/shop");
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", { level: 1, name: "Magazin" })).toBeVisible();

  if (products.length > 0) {
    await expect(
      page.getByTestId("product-card").filter({ hasText: products[0].name }),
    ).toBeVisible();
  } else {
    await expect(
      page.getByRole("heading", { name: "Nu există încă produse publicate" }),
    ).toBeVisible();
  }
});

test("RLS-ul public nu expune produse draft sau arhivate", async ({ request }) => {
  const unpublishedProducts = await readPublicRows<PublicProduct>(
    request,
    "products",
    {
      select: "name,slug,publication_status",
      publication_status: "neq.published",
    },
  );

  expect(unpublishedProducts).toEqual([]);
});

test("listarea și pagina unei categorii publice funcționează", async ({
  page,
  request,
}) => {
  const categories = await readPublicRows<PublicTaxonomy>(request, "categories", {
    select: "name,slug",
    order: "name.asc",
  });

  await page.goto("/categories");
  await expect(page.getByRole("heading", { level: 1, name: "Categorii" })).toBeVisible();

  if (categories.length > 0) {
    await page.goto(`/categories/${categories[0].slug}`);
    await expect(
      page.getByRole("heading", { level: 1, name: categories[0].name }),
    ).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: "Nu există categorii publice" })).toBeVisible();
  }
});

test("listarea și pagina unei colecții publice funcționează", async ({
  page,
  request,
}) => {
  const collections = await readPublicRows<PublicTaxonomy>(request, "collections", {
    select: "name,slug",
    order: "name.asc",
  });

  await page.goto("/collections");
  await expect(page.getByRole("heading", { level: 1, name: "Colecții" })).toBeVisible();

  if (collections.length > 0) {
    await page.goto(`/collections/${collections[0].slug}`);
    await expect(
      page.getByRole("heading", { level: 1, name: collections[0].name }),
    ).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: "Nu există colecții publice" })).toBeVisible();
  }
});

test("categoriile și colecțiile inexistente răspund cu 404", async ({ page }) => {
  const categoryResponse = await page.goto("/categories/categorie-care-nu-exista-e2e");
  expect(categoryResponse?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Pagina nu a fost găsită" })).toBeVisible();

  const collectionResponse = await page.goto("/collections/colectie-care-nu-exista-e2e");
  expect(collectionResponse?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Pagina nu a fost găsită" })).toBeVisible();
});

test("navigarea storefront rămâne utilizabilă responsive", async ({ page }) => {
  await page.goto("/");

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    const navigation = page.getByRole("navigation", {
      name: "Navigare principală",
    });
    await expect(navigation.getByRole("link", { name: "Magazin" })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Categorii" })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Colecții" })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  }
});

test("vizitatorul public nu primește acces administrativ", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Autentificare" })).toBeVisible();
});
