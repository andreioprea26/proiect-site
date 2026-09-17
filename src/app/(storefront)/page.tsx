import { getPublicStoreSettings } from "@/lib/store-settings/server";
import { HeroBlock } from "./_components/hero-block";
import type { Metadata } from "next";
import Link from "next/link";

import { getPublicHomepageBlocks, type HomepageBlock } from "@/lib/homepage/server";
import { getStorefrontHomeData } from "@/lib/storefront/catalog";

import { ProductGrid } from "./_components/product-grid";
import { TaxonomyGrid } from "./_components/taxonomy-grid";

type HomePageProps = { searchParams: Promise<{ logout?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
  const store = await getPublicStoreSettings();
  return {
    description: store.seoDescription,
    alternates: { canonical: "/" },
  };
}

export default async function Home({ searchParams }: HomePageProps) {
  const store = await getPublicStoreSettings();
  const [{ logout }, { products, categories, collections }, blocks] = await Promise.all([
    searchParams,
    getStorefrontHomeData(),
    getPublicHomepageBlocks(),
  ]);
  const heroIsActive = blocks.some((block) => block.slot === "hero" && block.isActive);

  return (
    <main>
      {!heroIsActive ? <h1 className="sr-only">{store.name}</h1> : null}
      {logout === "error" ? <p className="mx-auto mt-5 max-w-7xl rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">Deconectarea nu a putut fi finalizată. Încearcă din nou.</p> : null}
      {blocks.filter((block) => block.isActive).map((block) => {
        if (block.slot === "hero") return <HeroBlock block={block} store={store} key={block.slot} />;
        if (block.slot === "categories") return <StandardSection block={block} key={block.slot} sectionId="home-categories"><TaxonomyGrid items={categories.slice(0, 6)} kind="categories" /></StandardSection>;
        if (block.slot === "products") return <StandardSection block={block} key={block.slot} sectionId="home-products" tinted><ProductGrid products={products} /></StandardSection>;
        if (block.slot === "collections") return <StandardSection block={block} key={block.slot} sectionId="home-collections"><TaxonomyGrid items={collections.slice(0, 6)} kind="collections" /></StandardSection>;
        return <PromoBlock block={block} key={block.slot} />;
      })}
    </main>
  );
}


function StandardSection({ block, children, sectionId, tinted = false }: { block: HomepageBlock; children: React.ReactNode; sectionId: string; tinted?: boolean }) {
  const content = <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8" aria-labelledby={sectionId}><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div>{block.eyebrow ? <p className="text-sm font-semibold text-brand">{block.eyebrow}</p> : null}<h2 className="mt-2 text-3xl font-semibold tracking-tight" id={sectionId}>{block.title}</h2>{block.subtitle ? <p className="mt-3 max-w-2xl text-brand-muted">{block.subtitle}</p> : null}</div>{block.ctaLabel && block.ctaHref ? <Link className="font-semibold text-brand hover:underline" href={block.ctaHref}>{block.ctaLabel} →</Link> : null}</div>{children}</div>;
  return tinted ? <section className="border-y border-brand-border/25 bg-brand-accent/40" data-homepage-slot={block.slot}>{content}</section> : <section data-homepage-slot={block.slot}>{content}</section>;
}

function PromoBlock({ block }: { block: HomepageBlock }) {
  return <section className="brand-inverse border-y border-brand/10 bg-brand-strong text-brand-foreground" data-homepage-slot="promo"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-14 sm:px-8 lg:flex-row lg:items-center"><div>{block.eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-on-strong">{block.eyebrow}</p> : null}<h2 className="mt-2 text-3xl font-semibold">{block.title}</h2>{block.subtitle ? <p className="mt-3 max-w-2xl text-brand-on-strong">{block.subtitle}</p> : null}</div>{block.ctaLabel && block.ctaHref ? <Link className="rounded-full bg-brand-surface px-6 py-3 font-semibold text-brand-strong" href={block.ctaHref}>{block.ctaLabel}</Link> : null}</div></section>;
}
