import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArchiveProductButton } from "@/app/admin/_components/archive-product-button";
import { CustomizationManager } from "@/app/admin/_components/customization-manager";
import { ImageManager } from "@/app/admin/_components/image-manager";
import { InventoryManager } from "@/app/admin/_components/inventory-manager";
import { ProductForm } from "@/app/admin/_components/product-form";
import { VariantManager } from "@/app/admin/_components/variant-manager";
import type { ProductRecord, TaxonomyRecord } from "@/lib/admin/catalog";
import { isValidUuid } from "@/lib/admin/catalog-validation";
import type {
  CustomizationOptionRecord,
  InventoryMovementRecord,
  InventoryRecord,
  ProductImageRecord,
  ProductVariantRecord,
} from "@/lib/admin/product-details";
import { requireAdminContext } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Editare produs | Admin" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!isValidUuid(id)) notFound();

  const { supabase } = await requireAdminContext();
  const [productResult, categoriesResult, collectionsResult, productCategoriesResult, productCollectionsResult, variantsResult, customizationsResult, imagesResult] = await Promise.all([
    supabase.from("products").select("id, name, slug, description, base_price, product_type, publication_status, availability_status, is_customizable, lead_time_days, updated_at").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name, slug, description").order("name"),
    supabase.from("collections").select("id, name, slug, description").order("name"),
    supabase.from("product_categories").select("category_id").eq("product_id", id),
    supabase.from("product_collections").select("collection_id").eq("product_id", id),
    supabase.from("product_variants").select("id, product_id, title, attributes, price_override, sku, is_active, display_order").eq("product_id", id).order("display_order").order("created_at"),
    supabase.from("customization_options").select("id, product_id, name, description, option_type, is_required, additional_cost, configuration, display_order, is_active").eq("product_id", id).order("display_order").order("created_at"),
    supabase.from("product_images").select("id, product_id, storage_path, display_order, alt_text").eq("product_id", id).order("display_order"),
  ]);

  if (productResult.error || !productResult.data) notFound();
  if (categoriesResult.error || collectionsResult.error || productCategoriesResult.error || productCollectionsResult.error || variantsResult.error || customizationsResult.error || imagesResult.error) {
    throw new Error("Produsul nu a putut fi încărcat complet.");
  }

  const variants = (variantsResult.data ?? []) as ProductVariantRecord[];
  const [directInventoryResult, variantInventoryResult] = await Promise.all([
    supabase.from("inventory").select("id, product_id, variant_id, quantity, low_stock_threshold").eq("product_id", id),
    variants.length > 0
      ? supabase.from("inventory").select("id, product_id, variant_id, quantity, low_stock_threshold").in("variant_id", variants.map((variant) => variant.id))
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (directInventoryResult.error || variantInventoryResult.error) throw new Error("Inventarul nu a putut fi încărcat.");

  const inventories = [...(directInventoryResult.data ?? []), ...(variantInventoryResult.data ?? [])] as InventoryRecord[];
  const movementResult = inventories.length > 0
    ? await supabase.from("inventory_movements").select("id, inventory_id, quantity_delta, quantity_before, quantity_after, reason, actor_user_id, created_at").in("inventory_id", inventories.map((inventory) => inventory.id)).order("created_at", { ascending: false }).limit(100)
    : { data: [], error: null };
  if (movementResult.error) throw new Error("Istoricul inventarului nu a putut fi încărcat.");

  const images = (imagesResult.data ?? []).map((image) => ({
    ...image,
    public_url: supabase.storage.from("product-images").getPublicUrl(image.storage_path).data.publicUrl,
  })) as ProductImageRecord[];

  return (
    <div>
      <Link className="text-sm text-emerald-400 underline-offset-4 hover:underline" href="/admin/products">← Înapoi la produse</Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Editează produsul</h1>
          <p className="mt-2 text-stone-300">{productResult.data.name}</p>
        </div>
        {productResult.data.publication_status !== "archived" ? <ArchiveProductButton productId={id} /> : null}
      </div>
      <nav aria-label="Secțiunile editorului" className="mt-6 flex flex-wrap gap-2 text-sm">
        <a className="rounded-full border border-stone-700 px-3 py-1.5" href="#date-produs">Date produs</a>
        <a className="rounded-full border border-stone-700 px-3 py-1.5" href="#variante">Variante</a>
        <a className="rounded-full border border-stone-700 px-3 py-1.5" href="#personalizari">Personalizări</a>
        <a className="rounded-full border border-stone-700 px-3 py-1.5" href="#imagini">Imagini</a>
        <a className="rounded-full border border-stone-700 px-3 py-1.5" href="#inventar">Inventar</a>
      </nav>
      {query.created === "1" ? (
        <p className="mt-6 rounded-lg bg-emerald-950 p-3 text-sm text-emerald-200" role="status">Produsul a fost creat.</p>
      ) : null}
      <div className="mt-8" id="date-produs">
        <ProductForm
          categories={(categoriesResult.data ?? []) as TaxonomyRecord[]}
          collections={(collectionsResult.data ?? []) as TaxonomyRecord[]}
          initialCategoryIds={(productCategoriesResult.data ?? []).map((item) => item.category_id)}
          initialCollectionIds={(productCollectionsResult.data ?? []).map((item) => item.collection_id)}
          product={productResult.data as ProductRecord}
        />
      </div>
      <div className="mt-8 grid gap-8">
        <VariantManager hasDirectInventory={inventories.some((inventory) => inventory.product_id === id)} productId={id} variants={variants} />
        <CustomizationManager options={(customizationsResult.data ?? []) as CustomizationOptionRecord[]} productId={id} />
        <ImageManager images={images} productId={id} />
        <InventoryManager
          inventories={inventories}
          movements={(movementResult.data ?? []) as InventoryMovementRecord[]}
          productId={id}
          productType={productResult.data.product_type}
          variants={variants}
        />
      </div>
    </div>
  );
}
