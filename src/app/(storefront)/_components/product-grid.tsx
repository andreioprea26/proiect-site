import type { StorefrontProduct } from "@/lib/storefront/catalog";

import { EmptyState } from "./empty-state";
import { ProductCard } from "./product-card";

export function ProductGrid({
  products,
  emptyTitle = "Nu există încă produse publicate",
  emptyDescription = "Revenim curând cu produse handmade pregătite pentru tine.",
}: {
  products: StorefrontProduct[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (products.length === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
