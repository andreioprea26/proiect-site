/** @jsxImportSource react */
import Link from "next/link";
import { STORE_CONFIG, type PublicStoreConfig } from "@/lib/config/store";
import type { HomepageBlock } from "@/lib/homepage/server";

export function HeroBlock({ block, store = STORE_CONFIG }: { block: HomepageBlock; store?: PublicStoreConfig }) {
  return (
    <section className="overflow-hidden border-b border-brand-border/25 bg-gradient-to-br from-brand-accent via-brand-background to-brand-tint" data-homepage-slot="hero">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          {block.eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">{block.eyebrow}</p> : null}
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-brand-text sm:text-6xl">{block.title}</h1>
          {block.subtitle ? <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-muted">{block.subtitle}</p> : null}
          {block.ctaLabel && block.ctaHref ? <div className="mt-8 flex flex-wrap gap-3"><Link className="rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus" href={block.ctaHref}>{block.ctaLabel}</Link><Link className="rounded-full border border-brand-border bg-brand-surface/70 px-6 py-3 font-semibold text-brand-text transition hover:bg-brand-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus" href="/categories">Vezi categoriile</Link></div> : null}
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-brand-surface/65 p-6 shadow-xl shadow-brand-strong/5 backdrop-blur sm:p-8">
          <p className="text-sm font-semibold text-brand">{store.copy.highlightsTitle}</p>
          <ul className="mt-5 grid gap-4 text-brand-muted">{store.copy.highlights.map((text) => <li className="rounded-2xl bg-brand-surface px-5 py-4" key={text}>{text}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}
