import type { Metadata } from "next";
import Link from "next/link";

import { getShopData } from "@/lib/storefront/catalog";

import { ProductGrid } from "../_components/product-grid";

export const metadata: Metadata = {
  title: "Magazin | Brand Handmade",
  description: "Explorează produsele handmade publicate în magazin.",
};

export default async function ShopPage() {
  const { products, categories } = await getShopData();

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

      {categories.length > 0 ? (
        <nav aria-label="Categorii Magazin" className="mt-8 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:border-emerald-700 hover:text-emerald-900"
              href={`/categories/${category.slug}`}
              key={category.id}
            >
              {category.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <section className="mt-10" aria-label="Produse publicate">
        <ProductGrid products={products} />
      </section>
    </main>
  );
}
