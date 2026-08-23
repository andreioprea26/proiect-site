import Image from "next/image";

import {
  AVAILABILITY_STATUS_LABELS,
  PRODUCT_TYPE_LABELS,
} from "@/lib/admin/catalog";
import type { StorefrontProduct } from "@/lib/storefront/catalog";

const currency = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "RON",
});

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const badges = [
    product.productType === "unique" ? PRODUCT_TYPE_LABELS.unique : null,
    product.productType === "made_to_order"
      ? PRODUCT_TYPE_LABELS.made_to_order
      : null,
    product.isCustomizable ? "Personalizabil" : null,
  ].filter(Boolean);

  return (
    <article
      className="group overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"
      data-testid="product-card"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-amber-100 via-rose-50 to-emerald-50">
        {product.image ? (
          <Image
            alt={product.image.altText ?? product.name}
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            src={product.image.url}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-stone-500">
            Imagine în pregătire
          </div>
        )}
      </div>
      <div className="p-5">
        {badges.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2" aria-label="Caracteristici produs">
            {badges.map((badge) => (
              <span
                className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-950"
                key={badge}
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}
        <h3 className="text-lg font-semibold text-stone-950">{product.name}</h3>
        <div className="mt-3 flex items-end justify-between gap-4">
          <p className="font-semibold text-emerald-900">
            {product.hasVariantPricing ? "De la " : ""}
            {currency.format(product.displayPrice)}
          </p>
          <p className="text-right text-sm text-stone-600">
            {AVAILABILITY_STATUS_LABELS[product.availabilityStatus]}
          </p>
        </div>
      </div>
    </article>
  );
}
