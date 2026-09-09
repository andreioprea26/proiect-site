import type { Metadata } from "next";

import { getCollections } from "@/lib/storefront/catalog";

import { TaxonomyGrid } from "../_components/taxonomy-grid";

export const metadata: Metadata = {
  title: "Colecții",
  description: "Explorează selecțiile și colecțiile handmade publicate.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="mb-10 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">Selecții</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Colecții</h1>
        <p className="mt-5 text-lg leading-8 text-stone-600">Descoperă selecții create pentru anotimpuri, sărbători și momente speciale.</p>
      </header>
      <TaxonomyGrid headingLevel={2} items={collections} kind="collections" />
    </main>
  );
}
