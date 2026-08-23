import type { Metadata } from "next";
import Link from "next/link";

import { getStorefrontHomeData } from "@/lib/storefront/catalog";

import { ProductGrid } from "./_components/product-grid";
import { TaxonomyGrid } from "./_components/taxonomy-grid";

type HomePageProps = {
  searchParams: Promise<{ logout?: string | string[] }>;
};

export const metadata: Metadata = {
  title: "Brand Handmade | Produse lucrate manual",
  description: "Descoperă produse handmade, unicate și creații realizate la comandă în România.",
};

export default async function Home({ searchParams }: HomePageProps) {
  const [{ logout }, { products, categories, collections }] =
    await Promise.all([searchParams, getStorefrontHomeData()]);

  return (
    <main>
      <section className="overflow-hidden border-b border-stone-200 bg-gradient-to-br from-amber-100 via-[#fbfaf6] to-emerald-100/70">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-800">
              Lucrat manual în România
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-6xl">
              Obiecte handmade pentru gesturi care rămân.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
              Descoperă produse realizate în serii mici, unicate și creații
              pregătite special la comandă.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-emerald-900 px-6 py-3 font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                href="/shop"
              >
                Descoperă Magazinul
              </Link>
              <Link
                className="rounded-full border border-stone-300 bg-white/70 px-6 py-3 font-semibold text-stone-800 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                href="/categories"
              >
                Vezi categoriile
              </Link>
            </div>
            {logout === "error" ? (
              <p
                className="mt-5 max-w-xl rounded-xl bg-red-50 p-3 text-sm text-red-800"
                role="alert"
              >
                Deconectarea nu a putut fi finalizată. Încearcă din nou.
              </p>
            ) : null}
          </div>
          <div className="rounded-[2rem] border border-white/70 bg-white/65 p-6 shadow-xl shadow-emerald-950/5 backdrop-blur sm:p-8">
            <p className="text-sm font-semibold text-emerald-900">De ce handmade?</p>
            <ul className="mt-5 grid gap-4 text-stone-700">
              <li className="rounded-2xl bg-white px-5 py-4">Lucrat cu atenție, nu în serie industrială</li>
              <li className="rounded-2xl bg-white px-5 py-4">Opțiuni unicat și realizate la comandă</li>
              <li className="rounded-2xl bg-white px-5 py-4">Livrare oriunde în România</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8" aria-labelledby="home-categories">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-800">Explorează</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight" id="home-categories">
              Categorii
            </h2>
          </div>
          <Link className="font-semibold text-emerald-900 hover:underline" href="/categories">
            Toate categoriile →
          </Link>
        </div>
        <TaxonomyGrid items={categories.slice(0, 6)} kind="categories" />
      </section>

      <section className="border-y border-stone-200 bg-amber-50/70">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8" aria-labelledby="home-products">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Din atelier</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight" id="home-products">
                Produse publicate recent
              </h2>
            </div>
            <Link className="font-semibold text-emerald-900 hover:underline" href="/shop">
              Vezi Magazinul →
            </Link>
          </div>
          <ProductGrid products={products} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8" aria-labelledby="home-collections">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-800">Selecții de sezon</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight" id="home-collections">
              Colecții
            </h2>
          </div>
          <Link className="font-semibold text-emerald-900 hover:underline" href="/collections">
            Toate colecțiile →
          </Link>
        </div>
        <TaxonomyGrid items={collections.slice(0, 6)} kind="collections" />
      </section>
    </main>
  );
}
