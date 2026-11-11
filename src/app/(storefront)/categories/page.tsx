import type { Metadata } from "next";

import { getCategories } from "@/lib/storefront/catalog";

import { TaxonomyGrid } from "../_components/taxonomy-grid";

export const metadata: Metadata = {
  title: "Categorii",
  description: "Explorează produsele handmade după categorie.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="mb-10 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">Explorează</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Categorii</h1>
        <p className="mt-5 text-lg leading-8 text-stone-600">Găsește mai ușor creațiile potrivite pentru tine sau pentru un dar.</p>
      </header>
      <TaxonomyGrid headingLevel={2} items={categories} kind="categories" />
    </main>
  );
}
