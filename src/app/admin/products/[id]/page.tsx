import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArchiveProductButton } from "@/app/admin/_components/archive-product-button";
import { ProductForm } from "@/app/admin/_components/product-form";
import type { ProductRecord, TaxonomyRecord } from "@/lib/admin/catalog";
import { isValidUuid } from "@/lib/admin/catalog-validation";
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
  const [productResult, categoriesResult, collectionsResult, productCategoriesResult, productCollectionsResult] = await Promise.all([
    supabase.from("products").select("id, name, slug, description, base_price, product_type, publication_status, availability_status, is_customizable, lead_time_days, updated_at").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name, slug, description").order("name"),
    supabase.from("collections").select("id, name, slug, description").order("name"),
    supabase.from("product_categories").select("category_id").eq("product_id", id),
    supabase.from("product_collections").select("collection_id").eq("product_id", id),
  ]);

  if (productResult.error || !productResult.data) notFound();
  if (categoriesResult.error || collectionsResult.error || productCategoriesResult.error || productCollectionsResult.error) {
    throw new Error("Produsul nu a putut fi încărcat complet.");
  }

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
      {query.created === "1" ? (
        <p className="mt-6 rounded-lg bg-emerald-950 p-3 text-sm text-emerald-200" role="status">Produsul a fost creat.</p>
      ) : null}
      <div className="mt-8">
        <ProductForm
          categories={(categoriesResult.data ?? []) as TaxonomyRecord[]}
          collections={(collectionsResult.data ?? []) as TaxonomyRecord[]}
          initialCategoryIds={(productCategoriesResult.data ?? []).map((item) => item.category_id)}
          initialCollectionIds={(productCollectionsResult.data ?? []).map((item) => item.collection_id)}
          product={productResult.data as ProductRecord}
        />
      </div>
    </div>
  );
}
