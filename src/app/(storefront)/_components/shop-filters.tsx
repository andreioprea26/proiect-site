import Link from "next/link";

import {
  AVAILABILITY_STATUS_LABELS,
  AVAILABILITY_STATUSES,
  PRODUCT_TYPE_LABELS,
  PRODUCT_TYPES,
} from "@/lib/admin/catalog";
import type { StorefrontTaxonomy } from "@/lib/storefront/catalog";
import type { ShopFilters } from "@/lib/storefront/discovery";

const controlClass =
  "mt-2 w-full rounded-xl border border-brand-border bg-brand-surface px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/25";

export function ShopFilters({
  filters,
  categories,
  collections,
}: {
  filters: ShopFilters;
  categories: StorefrontTaxonomy[];
  collections: StorefrontTaxonomy[];
}) {
  return (
    <form
      action="/shop"
      className="rounded-3xl border border-brand-border/25 bg-brand-surface p-5 shadow-sm"
      method="get"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <label className="text-sm font-medium text-brand-muted sm:col-span-2 lg:col-span-3 xl:col-span-2">
          Caută produse
          <input
            className={controlClass}
            defaultValue={filters.q}
            maxLength={100}
            name="q"
            placeholder="Nume sau descriere"
            type="search"
          />
        </label>
        <FilterSelect defaultValue={filters.category ?? ""} label="Categorie" name="category">
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>{category.name}</option>
          ))}
        </FilterSelect>
        <FilterSelect defaultValue={filters.collection ?? ""} label="Colecție" name="collection">
          {collections.map((collection) => (
            <option key={collection.id} value={collection.slug}>{collection.name}</option>
          ))}
        </FilterSelect>
        <FilterSelect defaultValue={filters.productType ?? ""} label="Tip produs" name="type">
          {PRODUCT_TYPES.map((type) => (
            <option key={type} value={type}>{PRODUCT_TYPE_LABELS[type]}</option>
          ))}
        </FilterSelect>
        <FilterSelect defaultValue={filters.availability ?? ""} label="Disponibilitate" name="availability">
          {AVAILABILITY_STATUSES.map((status) => (
            <option key={status} value={status}>{AVAILABILITY_STATUS_LABELS[status]}</option>
          ))}
        </FilterSelect>
        <FilterSelect
          defaultValue={filters.customizable === null ? "" : String(filters.customizable)}
          label="Personalizare"
          name="customizable"
        >
          <option value="true">Personalizabile</option>
          <option value="false">Fără personalizare</option>
        </FilterSelect>
        <FilterSelect defaultValue={filters.sort} label="Sortare" name="sort">
          <option value="newest">Cele mai noi</option>
          <option value="price_asc">Preț crescător</option>
          <option value="price_desc">Preț descrescător</option>
          <option value="name_asc">Nume A–Z</option>
        </FilterSelect>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
          type="submit"
        >
          Aplică
        </button>
        <Link
          className="rounded-full border border-brand-border px-5 py-2.5 text-sm font-semibold text-brand-muted transition hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
          href="/shop"
        >
          Resetează filtrele
        </Link>
      </div>
    </form>
  );
}

function FilterSelect({
  children,
  defaultValue,
  label,
  name,
}: {
  children: React.ReactNode;
  defaultValue: string;
  label: string;
  name: string;
}) {
  return (
    <label className="text-sm font-medium text-brand-muted">
      {label}
      <select className={controlClass} defaultValue={defaultValue} name={name}>
        <option value="">Toate</option>
        {children}
      </select>
    </label>
  );
}
