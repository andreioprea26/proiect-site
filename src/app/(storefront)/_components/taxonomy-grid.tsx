import Link from "next/link";

import type { StorefrontTaxonomy } from "@/lib/storefront/catalog";

import { EmptyState } from "./empty-state";

export function TaxonomyGrid({
  items,
  kind,
  headingLevel = 3,
}: {
  items: StorefrontTaxonomy[];
  kind: "categories" | "collections";
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  if (items.length === 0) {
    return (
      <EmptyState
        description={
          kind === "categories"
            ? "Categoriile vor apărea aici când au produse publicate."
            : "Colecțiile vor apărea aici când au produse publicate."
        }
        title={
          kind === "categories"
            ? "Nu există categorii publice"
            : "Nu există colecții publice"
        }
      />
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link
          className="group rounded-3xl border border-brand-border/25 bg-brand-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
          href={`/${kind}/${item.slug}`}
          key={item.id}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            {kind === "categories" ? "Categorie" : "Colecție"}
          </p>
          <Heading className="mt-3 text-xl font-semibold text-brand-text group-hover:text-brand">
            {item.name}
          </Heading>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-brand-muted">
            {item.description ??
              (kind === "categories"
                ? "Descoperă produsele din această categorie."
                : "Descoperă produsele acestei colecții.")}
          </p>
          <span className="mt-5 inline-block text-sm font-semibold text-brand">
            Vezi produsele →
          </span>
        </Link>
      ))}
    </div>
  );
}
