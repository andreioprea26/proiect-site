import { expect, type APIRequestContext, test } from "@playwright/test";

type PublicProduct = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  publication_status: string;
  availability_status: string;
  product_type: string;
  is_customizable: boolean;
};

type PublicTaxonomy = {
  id: string;
  name: string;
  slug: string;
};

type PublicRelation = {
  product_id: string;
  category_id?: string;
  collection_id?: string;
};

type PublicVariant = {
  id: string;
  product_id: string;
  title: string;
  is_active: boolean;
  price_override: number | null;
};

type PublicCustomization = {
  id: string;
  product_id: string;
  name: string;
  option_type: "selection" | "text" | "boolean" | "image";
  is_active: boolean;
};

type PublicImage = {
  product_id: string;
  alt_text: string | null;
  display_order: number;
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
  Object.entries(query).forEach(([key, value]) => endpoint.searchParams.set(key, value));
  const response = await request.get(endpoint.toString(), {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as T[];
}

async function publicProducts(request: APIRequestContext) {
  return readPublicRows<PublicProduct>(request, "products", {
    select: "id,name,slug,base_price,publication_status,availability_status,product_type,is_customizable",
    publication_status: "eq.published",
    order: "created_at.desc",
    limit: "120",
  });
}

test("Product Card deschide pagina produsului publicat", async ({ page, request }) => {
  const products = await publicProducts(request);
  await page.goto("/shop");

  if (products.length === 0) {
    await expect(page.getByRole("heading", { name: "Nu există încă produse publicate" })).toBeVisible();
    return;
  }

  const product = products[0];
  const cardLink = page.getByRole("link", { name: `Vezi produsul ${product.name}` });
  await expect(cardLink).toHaveAttribute("href", `/products/${product.slug}`);
  await cardLink.click();
  await expect(page).toHaveURL(new RegExp(`/products/${product.slug}$`));
  await expect(page.getByRole("heading", { level: 1, name: product.name })).toBeVisible();
});

test("produsul inexistent este 404, iar drafturile și arhivatele rămân ascunse", async ({
  page,
  request,
}) => {
  const hidden = await readPublicRows<PublicProduct>(request, "products", {
    select: "id,name,slug,base_price,publication_status,availability_status,product_type,is_customizable",
    publication_status: "neq.published",
  });
  expect(hidden).toEqual([]);

  const response = await page.goto("/products/produs-inexistent-e2e");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Pagina nu a fost găsită" })).toBeVisible();
});

test("galeria folosește imaginile publice sau fallback-ul", async ({ page, request }) => {
  const products = await publicProducts(request);
  if (products.length === 0) return;
  const product = products[0];
  const images = await readPublicRows<PublicImage>(request, "product_images", {
    select: "product_id,alt_text,display_order",
    product_id: `eq.${product.id}`,
    order: "display_order.asc",
  });

  await page.goto(`/products/${product.slug}`);
  if (images.length === 0) {
    await expect(page.getByText("Imagine în pregătire", { exact: true })).toBeVisible();
  } else {
    await expect(page.getByRole("img").first()).toBeVisible();
    if (images.length > 1) {
      await expect(page.getByRole("button", { name: "Afișează imaginea 2" })).toBeVisible();
    }
  }
});

test("pagina afișează numai variantele și personalizările active", async ({
  page,
  request,
}) => {
  const products = await publicProducts(request);
  if (products.length === 0) return;
  const product = products[0];
  const [variants, inactiveVariants, customizations, inactiveCustomizations] = await Promise.all([
    readPublicRows<PublicVariant>(request, "product_variants", {
      select: "id,product_id,title,is_active,price_override",
      product_id: `eq.${product.id}`,
      order: "display_order.asc",
    }),
    readPublicRows<PublicVariant>(request, "product_variants", {
      select: "id,product_id,title,is_active,price_override",
      is_active: "eq.false",
    }),
    readPublicRows<PublicCustomization>(request, "customization_options", {
      select: "id,product_id,name,option_type,is_active",
      product_id: `eq.${product.id}`,
      order: "display_order.asc",
    }),
    readPublicRows<PublicCustomization>(request, "customization_options", {
      select: "id,product_id,name,option_type,is_active",
      is_active: "eq.false",
    }),
  ]);
  expect(inactiveVariants).toEqual([]);
  expect(inactiveCustomizations).toEqual([]);

  await page.goto(`/products/${product.slug}`);
  if (variants.length === 0) {
    await expect(page.getByText("Acest produs nu are variante de selectat.")).toBeVisible();
  } else {
    for (const variant of variants) {
      await expect(page.getByText(variant.title, { exact: true })).toBeVisible();
    }
    if (variants.length > 1) {
      await page.getByRole("radio", { name: new RegExp(variants[1].title) }).check();
      await expect(page.getByTestId("configured-price")).toBeVisible();
    }
  }

  if (customizations.length === 0) {
    await expect(page.getByText("Acest produs nu are opțiuni de personalizare.")).toBeVisible();
  } else {
    for (const customization of customizations) {
      await expect(page.getByText(new RegExp(customization.name)).first()).toBeVisible();
    }
  }
});

test("căutarea și starea fără rezultate funcționează", async ({ page, request }) => {
  const products = await publicProducts(request);
  if (products.length > 0) {
    const query = products[0].name.slice(0, Math.min(products[0].name.length, 12));
    await page.goto(`/shop?q=${encodeURIComponent(query)}`);
    await expect(page.getByTestId("product-card").filter({ hasText: products[0].name })).toBeVisible();
  }

  await page.goto("/shop?q=rezultat-imposibil-e2e-739284");
  await expect(page.getByRole("heading", { name: "Nicio potrivire pentru selecția ta" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Înapoi la Magazin" })).toHaveAttribute("href", "/shop");
});

test("filtrele categorie și colecție sunt păstrate în URL", async ({ page, request }) => {
  const [categories, collections] = await Promise.all([
    readPublicRows<PublicTaxonomy>(request, "categories", {
      select: "id,name,slug",
      order: "name.asc",
    }),
    readPublicRows<PublicTaxonomy>(request, "collections", {
      select: "id,name,slug",
      order: "name.asc",
    }),
  ]);

  const params = new URLSearchParams();
  if (categories[0]) params.set("category", categories[0].slug);
  if (collections[0]) params.set("collection", collections[0].slug);
  await page.goto(`/shop?${params}`);

  if (categories[0]) {
    await expect(page.getByLabel("Categorie")).toHaveValue(categories[0].slug);
  }
  if (collections[0]) {
    await expect(page.getByLabel("Colecție")).toHaveValue(collections[0].slug);
  }
  await expect(page.getByRole("heading", { name: "Rezultate" })).toBeVisible();
});

test("filtrul de disponibilitate și sortarea funcționează împreună", async ({
  page,
  request,
}) => {
  const products = await publicProducts(request);
  const availability = products[0]?.availability_status ?? "in_stock";
  await page.goto(`/shop?availability=${availability}&sort=name_asc`);
  await expect(page.getByLabel("Disponibilitate")).toHaveValue(availability);
  await expect(page.getByLabel("Sortare")).toHaveValue("name_asc");

  const names = await page.getByTestId("product-card").locator("h3").allTextContents();
  const sortedNames = [...names].sort((first, second) =>
    new Intl.Collator("ro-RO", { sensitivity: "base" }).compare(first, second),
  );
  expect(names).toEqual(sortedNames);
});

test("search, filtrele și sortarea pot fi combinate", async ({ page, request }) => {
  const products = await publicProducts(request);
  if (products.length === 0) return;
  const product = products[0];
  const [categoryRelations, collectionRelations, categories, collections] = await Promise.all([
    readPublicRows<PublicRelation>(request, "product_categories", {
      select: "product_id,category_id",
      product_id: `eq.${product.id}`,
    }),
    readPublicRows<PublicRelation>(request, "product_collections", {
      select: "product_id,collection_id",
      product_id: `eq.${product.id}`,
    }),
    readPublicRows<PublicTaxonomy>(request, "categories", { select: "id,name,slug" }),
    readPublicRows<PublicTaxonomy>(request, "collections", { select: "id,name,slug" }),
  ]);
  const category = categories.find((item) => item.id === categoryRelations[0]?.category_id);
  const collection = collections.find((item) => item.id === collectionRelations[0]?.collection_id);
  const params = new URLSearchParams({
    q: product.name,
    availability: product.availability_status,
    type: product.product_type,
    customizable: String(product.is_customizable),
    sort: "price_asc",
  });
  if (category) params.set("category", category.slug);
  if (collection) params.set("collection", collection.slug);

  await page.goto(`/shop?${params}`);
  await expect(page.getByTestId("product-card").filter({ hasText: product.name })).toBeVisible();
  await expect(page.getByLabel("Sortare")).toHaveValue("price_asc");
});

test("valorile invalide sunt ignorate în siguranță", async ({ page }) => {
  const response = await page.goto(
    "/shop?type=invalid&availability=invalid&customizable=poate&sort=popular&category=INVALID!",
  );
  expect(response?.ok()).toBe(true);
  await expect(page.getByLabel("Tip produs")).toHaveValue("");
  await expect(page.getByLabel("Disponibilitate")).toHaveValue("");
  await expect(page.getByLabel("Personalizare")).toHaveValue("");
  await expect(page.getByLabel("Sortare")).toHaveValue("newest");
});

test("pagina produsului este responsive", async ({ page, request }) => {
  const products = await publicProducts(request);
  if (products.length === 0) return;
  await page.goto(`/products/${products[0].slug}`);

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole("heading", { level: 1, name: products[0].name })).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  }
});
