import type { Metadata } from "next";
import Link from "next/link";

import { getPublicHomepageBlocks, type HomepageBlock } from "@/lib/homepage/server";
import { getStorefrontHomeData } from "@/lib/storefront/catalog";

import { ProductGrid } from "./_components/product-grid";
import { TaxonomyGrid } from "./_components/taxonomy-grid";

type HomePageProps = { searchParams: Promise<{ logout?: string | string[] }> };

export const metadata: Metadata = {
  description: "Descoperă produse handmade, unicate și creații realizate la comandă în România.",
  alternates: { canonical: "/" },
};

export default async function Home({ searchParams }: HomePageProps) {
  const [{ logout }, { products, categories, collections }, blocks] = await Promise.all([
    searchParams,
    getStorefrontHomeData(),
    getPublicHomepageBlocks(),
  ]);
  const heroIsActive = blocks.some((block) => block.slot === "hero" && block.isActive);

  return (
    <main>
      {!heroIsActive ? <h1 className="sr-only">Brand Handmade</h1> : null}
      {logout === "error" ? <p className="mx-auto mt-5 max-w-7xl rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">Deconectarea nu a putut fi finalizată. Încearcă din nou.</p> : null}
      {blocks.filter((block) => block.isActive).map((block) => {
        if (block.slot === "hero") return <HeroBlock block={block} key={block.slot} />;
        if (block.slot === "categories") return <StandardSection block={block} key={block.slot} sectionId="home-categories"><TaxonomyGrid items={categories.slice(0, 6)} kind="categories" /></StandardSection>;
        if (block.slot === "products") return <StandardSection block={block} key={block.slot} sectionId="home-products" tinted><ProductGrid products={products} /></StandardSection>;
        if (block.slot === "collections") return <StandardSection block={block} key={block.slot} sectionId="home-collections"><TaxonomyGrid items={collections.slice(0, 6)} kind="collections" /></StandardSection>;
        return <PromoBlock block={block} key={block.slot} />;
      })}
    </main>
  );
}

function HeroBlock({ block }: { block: HomepageBlock }) {
  return (
    <section className="overflow-hidden border-b border-stone-200 bg-gradient-to-br from-amber-100 via-[#fbfaf6] to-emerald-100/70" data-homepage-slot="hero">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          {block.eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-800">{block.eyebrow}</p> : null}
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-6xl">{block.title}</h1>
          {block.subtitle ? <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">{block.subtitle}</p> : null}
          {block.ctaLabel && block.ctaHref ? <div className="mt-8 flex flex-wrap gap-3"><Link className="rounded-full bg-emerald-900 px-6 py-3 font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800" href={block.ctaHref}>{block.ctaLabel}</Link><Link className="rounded-full border border-stone-300 bg-white/70 px-6 py-3 font-semibold text-stone-800 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800" href="/categories">Vezi categoriile</Link></div> : null}
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-white/65 p-6 shadow-xl shadow-emerald-950/5 backdrop-blur sm:p-8">
          <p className="text-sm font-semibold text-emerald-900">De ce handmade?</p>
          <ul className="mt-5 grid gap-4 text-stone-700"><li className="rounded-2xl bg-white px-5 py-4">Lucrat cu atenție, nu în serie industrială</li><li className="rounded-2xl bg-white px-5 py-4">Opțiuni unicat și realizate la comandă</li><li className="rounded-2xl bg-white px-5 py-4">Livrare oriunde în România</li></ul>
        </div>
      </div>
    </section>
  );
}

function StandardSection({ block, children, sectionId, tinted = false }: { block: HomepageBlock; children: React.ReactNode; sectionId: string; tinted?: boolean }) {
  const content = <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8" aria-labelledby={sectionId}><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div>{block.eyebrow ? <p className="text-sm font-semibold text-emerald-800">{block.eyebrow}</p> : null}<h2 className="mt-2 text-3xl font-semibold tracking-tight" id={sectionId}>{block.title}</h2>{block.subtitle ? <p className="mt-3 max-w-2xl text-stone-600">{block.subtitle}</p> : null}</div>{block.ctaLabel && block.ctaHref ? <Link className="font-semibold text-emerald-900 hover:underline" href={block.ctaHref}>{block.ctaLabel} →</Link> : null}</div>{children}</div>;
  return tinted ? <section className="border-y border-stone-200 bg-amber-50/70" data-homepage-slot={block.slot}>{content}</section> : <section data-homepage-slot={block.slot}>{content}</section>;
}

function PromoBlock({ block }: { block: HomepageBlock }) {
  return <section className="border-y border-emerald-900/10 bg-emerald-950 text-white" data-homepage-slot="promo"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-14 sm:px-8 lg:flex-row lg:items-center"><div>{block.eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">{block.eyebrow}</p> : null}<h2 className="mt-2 text-3xl font-semibold">{block.title}</h2>{block.subtitle ? <p className="mt-3 max-w-2xl text-emerald-100/80">{block.subtitle}</p> : null}</div>{block.ctaLabel && block.ctaHref ? <Link className="rounded-full bg-white px-6 py-3 font-semibold text-emerald-950" href={block.ctaHref}>{block.ctaLabel}</Link> : null}</div></section>;
}
