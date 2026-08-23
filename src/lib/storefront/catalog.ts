import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AvailabilityStatus,
  ProductType,
} from "@/lib/admin/catalog";
import { createClient } from "@/lib/supabase/server";

type ProductImageRow = {
  storage_path: string;
  display_order: number;
  alt_text: string | null;
};

type ProductVariantRow = {
  price_override: number | string | null;
  is_active: boolean;
  display_order: number;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number | string;
  product_type: ProductType;
  availability_status: AvailabilityStatus;
  is_customizable: boolean;
  lead_time_days: number | null;
  product_images: ProductImageRow[] | null;
  product_variants: ProductVariantRow[] | null;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  displayPrice: number;
  hasVariantPricing: boolean;
  productType: ProductType;
  availabilityStatus: AvailabilityStatus;
  isCustomizable: boolean;
  leadTimeDays: number | null;
  image: {
    url: string;
    altText: string | null;
  } | null;
};

export type StorefrontTaxonomy = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

const productSelect = `
  id,
  name,
  slug,
  description,
  base_price,
  product_type,
  availability_status,
  is_customizable,
  lead_time_days,
  product_images (storage_path, display_order, alt_text),
  product_variants (price_override, is_active, display_order)
`;

function mapProduct(
  supabase: SupabaseClient,
  product: ProductRow,
): StorefrontProduct {
  const basePrice = Number(product.base_price);
  const variants = (product.product_variants ?? []).filter(
    (variant) => variant.is_active,
  );
  const variantPrices = variants.map((variant) =>
    variant.price_override === null ? basePrice : Number(variant.price_override),
  );
  const image = [...(product.product_images ?? [])].sort(
    (first, second) => first.display_order - second.display_order,
  )[0];

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    basePrice,
    displayPrice:
      variantPrices.length > 0 ? Math.min(...variantPrices) : basePrice,
    hasVariantPricing: variantPrices.length > 0,
    productType: product.product_type,
    availabilityStatus: product.availability_status,
    isCustomizable: product.is_customizable,
    leadTimeDays: product.lead_time_days,
    image: image
      ? {
          url: supabase.storage
            .from("product-images")
            .getPublicUrl(image.storage_path).data.publicUrl,
          altText: image.alt_text,
        }
      : null,
  };
}

async function loadProducts(
  supabase: SupabaseClient,
  options: { ids?: string[]; limit?: number } = {},
) {
  if (options.ids?.length === 0) return [];

  let query = supabase
    .from("products")
    .select(productSelect)
    .eq("publication_status", "published")
    .order("created_at", { ascending: false });

  if (options.ids) query = query.in("id", options.ids);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw new Error("Catalogul public nu a putut fi încărcat.");

  return ((data ?? []) as unknown as ProductRow[]).map((product) =>
    mapProduct(supabase, product),
  );
}

async function loadTaxonomies(
  supabase: SupabaseClient,
  table: "categories" | "collections",
) {
  const { data, error } = await supabase
    .from(table)
    .select("id, name, slug, description")
    .order("name");

  if (error) throw new Error("Navigarea catalogului nu a putut fi încărcată.");
  return (data ?? []) as StorefrontTaxonomy[];
}

export async function getStorefrontHomeData() {
  const supabase = await createClient();
  const [products, categories, collections] = await Promise.all([
    loadProducts(supabase, { limit: 8 }),
    loadTaxonomies(supabase, "categories"),
    loadTaxonomies(supabase, "collections"),
  ]);

  return { products, categories, collections };
}

export async function getShopData() {
  const supabase = await createClient();
  const [products, categories] = await Promise.all([
    loadProducts(supabase),
    loadTaxonomies(supabase, "categories"),
  ]);

  return { products, categories };
}

export async function getCategories() {
  return loadTaxonomies(await createClient(), "categories");
}

export async function getCollections() {
  return loadTaxonomies(await createClient(), "collections");
}

export async function getTaxonomyPage(
  kind: "category" | "collection",
  slug: string,
) {
  const supabase = await createClient();
  const table = kind === "category" ? "categories" : "collections";
  const relationTable =
    kind === "category" ? "product_categories" : "product_collections";
  const relationColumn = kind === "category" ? "category_id" : "collection_id";

  const { data: taxonomy, error: taxonomyError } = await supabase
    .from(table)
    .select("id, name, slug, description")
    .eq("slug", slug)
    .maybeSingle();

  if (taxonomyError) {
    throw new Error("Pagina catalogului nu a putut fi încărcată.");
  }
  if (!taxonomy) return null;

  const { data: relations, error: relationsError } = await supabase
    .from(relationTable)
    .select("product_id")
    .eq(relationColumn, taxonomy.id);

  if (relationsError) {
    throw new Error("Produsele asociate nu au putut fi încărcate.");
  }

  const products = await loadProducts(supabase, {
    ids: (relations ?? []).map((relation) => relation.product_id),
  });

  return {
    taxonomy: taxonomy as StorefrontTaxonomy,
    products,
  };
}
