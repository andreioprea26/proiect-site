import type { Metadata } from "next";
import Link from "next/link";

import { ProductForm } from "@/app/admin/_components/product-form";
import type { TaxonomyRecord } from "@/lib/admin/catalog";
import { requireAdminContext } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Produs nou | Admin" };

export default async function NewProductPage() {
  const { supabase } = await requireAdminContext();
  const [categoriesResult, collectionsResult] = await Promise.all([
    supabase.from("categories").select("id, name, slug, description").order("name"),
    supabase.from("collections").select("id, name, slug, description").order("name"),
  ]);

  if (categoriesResult.error || collectionsResult.error) {
    throw new Error("Opțiunile catalogului nu au putut fi încărcate.");
  }

  return (
    <div>
      <Link className="text-sm text-emerald-400 underline-offset-4 hover:underline" href="/admin/products">← Înapoi la produse</Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Produs nou</h1>
      <p className="mt-3 text-stone-300">Completează informațiile de bază și asocierile produsului.</p>
      <div className="mt-8">
        <ProductForm categories={(categoriesResult.data ?? []) as TaxonomyRecord[]} collections={(collectionsResult.data ?? []) as TaxonomyRecord[]} />
      </div>
    </div>
  );
}
