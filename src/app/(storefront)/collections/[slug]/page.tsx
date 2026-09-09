import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getTaxonomyPage } from "@/lib/storefront/catalog";

import { ProductGrid } from "../../_components/product-grid";

type CollectionPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getTaxonomyPage("collection", slug);
  return result
    ? {
        title: result.taxonomy.name,
        description: result.taxonomy.description?.slice(0, 160) ?? `Descoperă colecția handmade ${result.taxonomy.name}.`,
        alternates: { canonical: `/collections/${result.taxonomy.slug}` },
      }
    : { title: "Colecție indisponibilă", robots: { index: false, follow: false } };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const result = await getTaxonomyPage("collection", slug);
  if (!result) notFound();

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <Link className="text-sm font-semibold text-emerald-900 hover:underline" href="/collections">← Toate colecțiile</Link>
      <header className="mb-10 mt-6 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">Colecție</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{result.taxonomy.name}</h1>
        {result.taxonomy.description ? <p className="mt-5 text-lg leading-8 text-stone-600">{result.taxonomy.description}</p> : null}
      </header>
      <ProductGrid
        emptyDescription="Nu există momentan produse publicate în această colecție."
        emptyTitle="Colecția este pregătită pentru produse noi"
        headingLevel={2}
        products={result.products}
      />
    </main>
  );
}
