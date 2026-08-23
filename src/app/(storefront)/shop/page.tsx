import type { Metadata } from "next";

import { getShopData } from "@/lib/storefront/catalog";
import { parseShopFilters, type ShopSearchParams } from "@/lib/storefront/discovery";

import { EmptyState } from "../_components/empty-state";
import { ProductGrid } from "../_components/product-grid";
import { ShopFilters } from "../_components/shop-filters";

export const metadata: Metadata = {
  title: "Magazin | Brand Handmade",
  description: "Explorează produsele handmade publicate în magazin.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const parsedFilters = parseShopFilters(await searchParams);
  const { products, categories, collections, filters } = await getShopData(parsedFilters);
  const hasActiveFilters = Boolean(
    filters.q ||
      filters.category ||
      filters.collection ||
      filters.productType ||
      filters.availability ||
      filters.customizable !== null,
  );

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
          Catalog public
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Magazin</h1>
        <p className="mt-5 text-lg leading-8 text-stone-600">
          Descoperă produsele disponibile acum, unicatele și creațiile realizate
          la comandă.
        </p>
      </header>

      <div className="mt-8">
        <ShopFilters categories={categories} collections={collections} filters={filters} />
      </div>

      <section className="mt-10" aria-label="Produse publicate">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">Rezultate</h2>
          <p className="text-sm text-stone-600">
            {products.length} {products.length === 1 ? "produs" : "produse"}
          </p>
        </div>
        {products.length === 0 && hasActiveFilters ? (
          <EmptyState
            description="Schimbă termenul de căutare sau elimină unul dintre filtre."
            showShopLink
            title="Nicio potrivire pentru selecția ta"
          />
        ) : (
          <ProductGrid products={products} />
        )}
      </section>
    </main>
  );
}
