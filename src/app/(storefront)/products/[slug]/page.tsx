import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AVAILABILITY_STATUS_LABELS,
  PRODUCT_TYPE_LABELS,
} from "@/lib/admin/catalog";
import { getPublicProductBySlug } from "@/lib/storefront/catalog";

import { ProductConfigurator } from "../../_components/product-configurator";
import { ProductGallery } from "../../_components/product-gallery";

type ProductPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (!product) {
    return {
      title: "Produs indisponibil | Brand Handmade",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${product.name} | Brand Handmade`,
    description:
      product.description?.slice(0, 160) ??
      `Descoperă produsul handmade ${product.name}.`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);
  if (!product) notFound();

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-16">
      <Link className="text-sm font-semibold text-emerald-900 hover:underline" href="/shop">
        ← Înapoi la Magazin
      </Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:items-start">
        <ProductGallery images={product.images} productName={product.name} />
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
            {PRODUCT_TYPE_LABELS[product.productType]}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
            {product.name}
          </h1>
          <div className="mt-5 flex flex-wrap gap-2" aria-label="Caracteristici produs">
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-950">
              {AVAILABILITY_STATUS_LABELS[product.availabilityStatus]}
            </span>
            {product.productType === "unique" ? (
              <span className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-950">Produs unicat</span>
            ) : null}
            {product.isCustomizable ? (
              <span className="rounded-full bg-rose-100 px-3 py-1.5 text-sm font-semibold text-rose-950">Personalizabil</span>
            ) : null}
          </div>
          {product.description ? (
            <p className="mt-6 whitespace-pre-line text-lg leading-8 text-stone-600">{product.description}</p>
          ) : (
            <p className="mt-6 text-stone-600">Descrierea acestui produs este în pregătire.</p>
          )}
          {product.leadTimeDays ? (
            <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
              Termen estimativ de realizare sau expediere: <strong>{product.leadTimeDays} zile</strong>.
            </p>
          ) : null}

          {(product.categories.length > 0 || product.collections.length > 0) ? (
            <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              {product.categories.length > 0 ? (
                <div>
                  <h2 className="font-semibold text-stone-950">Categorii</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.categories.map((category) => (
                      <Link className="rounded-full border border-stone-300 px-3 py-1.5 hover:border-emerald-700" href={`/categories/${category.slug}`} key={category.id}>{category.name}</Link>
                    ))}
                  </div>
                </div>
              ) : null}
              {product.collections.length > 0 ? (
                <div>
                  <h2 className="font-semibold text-stone-950">Colecții</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.collections.map((collection) => (
                      <Link className="rounded-full border border-stone-300 px-3 py-1.5 hover:border-emerald-700" href={`/collections/${collection.slug}`} key={collection.id}>{collection.name}</Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 border-t border-stone-200 pt-8">
            <ProductConfigurator
              basePrice={product.basePrice}
              customizations={product.customizations}
              variants={product.variants}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
