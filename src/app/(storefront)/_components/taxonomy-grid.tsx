import Link from "next/link";

import type { StorefrontTaxonomy } from "@/lib/storefront/catalog";

import { EmptyState } from "./empty-state";

export function TaxonomyGrid({
  items,
  kind,
}: {
  items: StorefrontTaxonomy[];
  kind: "categories" | "collections";
}) {
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
          className="group rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-700/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          href={`/${kind}/${item.slug}`}
          key={item.id}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
            {kind === "categories" ? "Categorie" : "Colecție"}
          </p>
          <h3 className="mt-3 text-xl font-semibold text-stone-950 group-hover:text-emerald-900">
            {item.name}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">
            {item.description ??
              (kind === "categories"
                ? "Descoperă produsele din această categorie."
                : "Descoperă produsele acestei colecții.")}
          </p>
          <span className="mt-5 inline-block text-sm font-semibold text-emerald-900">
            Vezi produsele →
          </span>
        </Link>
      ))}
    </div>
  );
}
