import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import type {
  AvailabilityStatus,
  ProductType,
} from "@/lib/admin/catalog";
import type {
  CustomizationType,
} from "@/lib/admin/product-details";
import { createClient } from "@/lib/supabase/server";

import {
  SHOP_RESULTS_LIMIT,
  type ShopFilters,
} from "./discovery";

type ProductImageRow = {
  storage_path: string;
  display_order: number;
  alt_text: string | null;
};

type ProductVariantRow = {
  id: string;
  title: string;
  attributes: Record<string, string>;
  price_override: number | string | null;
  is_active: boolean;
  display_order: number;
};

type ProductCustomizationRow = {
  id: string;
  name: string;
  description: string | null;
  option_type: CustomizationType;
  is_required: boolean;
  additional_cost: number | string;
  configuration: Record<string, unknown>;
  display_order: number;
  is_active: boolean;
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
  created_at: string;
  product_images: ProductImageRow[] | null;
  product_variants: ProductVariantRow[] | null;
  product_categories: { category_id: string }[] | null;
  product_collections: { collection_id: string }[] | null;
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
  createdAt: string;
  categoryIds: string[];
  collectionIds: string[];
  image: {
    url: string;
    altText: string | null;
  } | null;
};

export type StorefrontProductDetail = StorefrontProduct & {
  images: {
    url: string;
    altText: string | null;
  }[];
  variants: {
    id: string;
    title: string;
    attributes: Record<string, string>;
    priceOverride: number | null;
    effectivePrice: number;
  }[];
  customizations: {
    id: string;
    name: string;
    description: string | null;
    optionType: CustomizationType;
    isRequired: boolean;
    additionalCost: number;
    configuration: Record<string, unknown>;
  }[];
  categories: StorefrontTaxonomy[];
  collections: StorefrontTaxonomy[];
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
  created_at,
  product_images (storage_path, display_order, alt_text),
  product_variants (id, title, attributes, price_override, is_active, display_order),
  product_categories (category_id),
  product_collections (collection_id)
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
    createdAt: product.created_at,
    categoryIds: (product.product_categories ?? []).map(
      (relation) => relation.category_id,
    ),
    collectionIds: (product.product_collections ?? []).map(
      (relation) => relation.collection_id,
    ),
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

function filterAndSortProducts(
  products: StorefrontProduct[],
  filters: ShopFilters,
  categories: StorefrontTaxonomy[],
  collections: StorefrontTaxonomy[],
) {
  const categoryId = categories.find(
    (category) => category.slug === filters.category,
  )?.id;
  const collectionId = collections.find(
    (collection) => collection.slug === filters.collection,
  )?.id;
  const normalizedQuery = filters.q.toLocaleLowerCase("ro-RO");

  const effectiveFilters: ShopFilters = {
    ...filters,
    category: categoryId ? filters.category : null,
    collection: collectionId ? filters.collection : null,
  };

  const filtered = products.filter((product) => {
    const searchableText = `${product.name} ${product.description ?? ""}`
      .toLocaleLowerCase("ro-RO");

    return (
      (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
      (!categoryId || product.categoryIds.includes(categoryId)) &&
      (!collectionId || product.collectionIds.includes(collectionId)) &&
      (!filters.productType || product.productType === filters.productType) &&
      (!filters.availability ||
        product.availabilityStatus === filters.availability) &&
      (filters.customizable === null ||
        product.isCustomizable === filters.customizable)
    );
  });

  const collator = new Intl.Collator("ro-RO", { sensitivity: "base" });
  filtered.sort((first, second) => {
    if (filters.sort === "price_asc") {
      return first.displayPrice - second.displayPrice;
    }
    if (filters.sort === "price_desc") {
      return second.displayPrice - first.displayPrice;
    }
    if (filters.sort === "name_asc") {
      return collator.compare(first.name, second.name);
    }
    return Date.parse(second.createdAt) - Date.parse(first.createdAt);
  });

  return { products: filtered, filters: effectiveFilters };
}

export async function getShopData(filters: ShopFilters) {
  const supabase = await createClient();
  const [products, categories, collections] = await Promise.all([
    loadProducts(supabase, { limit: SHOP_RESULTS_LIMIT }),
    loadTaxonomies(supabase, "categories"),
    loadTaxonomies(supabase, "collections"),
  ]);
  const result = filterAndSortProducts(
    products,
    filters,
    categories,
    collections,
  );

  return { ...result, categories, collections };
}

export async function getCategories() {
  return loadTaxonomies(await createClient(), "categories");
}

export async function getCollections() {
  return loadTaxonomies(await createClient(), "collections");
}

export const getTaxonomyPage = cache(async function getTaxonomyPage(
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
});

async function loadRelatedTaxonomies(
  supabase: SupabaseClient,
  relationTable: "product_categories" | "product_collections",
  relationColumn: "category_id" | "collection_id",
  taxonomyTable: "categories" | "collections",
  productId: string,
) {
  const { data: relations, error: relationError } = await supabase
    .from(relationTable)
    .select(relationColumn)
    .eq("product_id", productId);
  if (relationError) throw new Error("Relațiile produsului nu au putut fi încărcate.");

  const ids = (relations ?? []).map(
    (relation) =>
      relationColumn === "category_id"
        ? (relation as { category_id: string }).category_id
        : (relation as { collection_id: string }).collection_id,
  );
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from(taxonomyTable)
    .select("id, name, slug, description")
    .in("id", ids)
    .order("name");
  if (error) throw new Error("Taxonomiile produsului nu au putut fi încărcate.");
  return (data ?? []) as StorefrontTaxonomy[];
}

export const getPublicProductBySlug = cache(async function getPublicProductBySlug(
  slug: string,
): Promise<StorefrontProductDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(`${productSelect}, customization_options (id, name, description, option_type, is_required, additional_cost, configuration, display_order, is_active)`)
    .eq("slug", slug)
    .eq("publication_status", "published")
    .maybeSingle();

  if (error) throw new Error("Produsul public nu a putut fi încărcat.");
  if (!data) return null;

  const product = data as unknown as ProductRow & {
    customization_options: ProductCustomizationRow[] | null;
  };
  const [categories, collections] = await Promise.all([
    loadRelatedTaxonomies(
      supabase,
      "product_categories",
      "category_id",
      "categories",
      product.id,
    ),
    loadRelatedTaxonomies(
      supabase,
      "product_collections",
      "collection_id",
      "collections",
      product.id,
    ),
  ]);
  const base = mapProduct(supabase, product);
  const images = [...(product.product_images ?? [])]
    .sort((first, second) => first.display_order - second.display_order)
    .map((image) => ({
      url: supabase.storage
        .from("product-images")
        .getPublicUrl(image.storage_path).data.publicUrl,
      altText: image.alt_text,
    }));
  const variants = [...(product.product_variants ?? [])]
    .filter((variant) => variant.is_active)
    .sort((first, second) => first.display_order - second.display_order)
    .map((variant) => ({
      id: variant.id,
      title: variant.title,
      attributes: variant.attributes,
      priceOverride:
        variant.price_override === null ? null : Number(variant.price_override),
      effectivePrice:
        variant.price_override === null
          ? base.basePrice
          : Number(variant.price_override),
    }));
  const customizations = [...(product.customization_options ?? [])]
    .filter((customization) => customization.is_active)
    .sort((first, second) => first.display_order - second.display_order)
    .map((customization) => ({
      id: customization.id,
      name: customization.name,
      description: customization.description,
      optionType: customization.option_type,
      isRequired: customization.is_required,
      additionalCost: Number(customization.additional_cost),
      configuration: customization.configuration,
    }));

  return {
    ...base,
    images,
    variants,
    customizations,
    categories,
    collections,
  };
});
