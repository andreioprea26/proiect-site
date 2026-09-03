import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AVAILABILITY_STATUS_LABELS,
  PRODUCT_TYPE_LABELS,
} from "@/lib/admin/catalog";
import { getPublicProductBySlug } from "@/lib/storefront/catalog";
import { getFavoriteState } from "@/lib/account/favorites";
import { getCustomerReviewState, getPublicProductReviews } from "@/lib/reviews/server";

import { FavoriteButton } from "../../_components/favorite-button";
import { ProductConfigurator } from "../../_components/product-configurator";
import { ProductGallery } from "../../_components/product-gallery";
import { ReviewForm } from "../../_components/review-form";

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
  const [favorite, reviewState, publicReviews] = await Promise.all([
    getFavoriteState(product.id),
    getCustomerReviewState(product.id),
    getPublicProductReviews(product.id),
  ]);

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
          <div className="mt-6">
            <FavoriteButton
              authenticated={favorite.authenticated}
              initialFavorite={favorite.isFavorite}
              productId={product.id}
              productSlug={product.slug}
            />
          </div>
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
            <ProductConfigurator product={product} />
          </div>
        </div>
      </div>
      <section className="mt-16 border-t border-stone-200 pt-10" aria-labelledby="product-reviews">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold text-emerald-800">Păreri de la clienți</p><h2 className="mt-2 text-3xl font-semibold" id="product-reviews">Recenzii</h2></div>
          <p className="text-sm text-stone-600">{publicReviews.averageRating === null ? "Nicio recenzie aprobată" : `${publicReviews.averageRating.toFixed(1)} / 5 · ${publicReviews.reviews.length} ${publicReviews.reviews.length === 1 ? "recenzie" : "recenzii"}`}</p>
        </div>
        {publicReviews.reviews.length ? <div className="mt-6 grid gap-4 md:grid-cols-2">{publicReviews.reviews.map((review) => <article className="rounded-2xl border border-stone-200 bg-white p-5" key={review.id}><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">{review.rating}/5 · {review.authorDisplayName}</p>{review.verifiedPurchase ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Achiziție verificată</span> : null}</div><p className="mt-4 whitespace-pre-line text-sm leading-6 text-stone-700">{review.text}</p><p className="mt-3 text-xs text-stone-500">{new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeZone: "Europe/Bucharest" }).format(new Date(review.createdAt))}</p></article>)}</div> : <p className="mt-6 rounded-xl border border-dashed border-stone-300 p-5 text-stone-600">Acest produs nu are încă recenzii publicate.</p>}
        <div className="mt-10 max-w-2xl"><h3 className="text-xl font-semibold">Scrie o recenzie</h3>{!reviewState.authenticated ? <p className="mt-3 text-sm text-stone-600">Autentifică-te pentru a verifica eligibilitatea achiziției.</p> : reviewState.existingStatus ? <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Ai trimis deja o recenzie pentru acest produs. Status: {reviewState.existingStatus === "pending" ? "în așteptarea moderării" : reviewState.existingStatus === "approved" ? "aprobată" : "respinsă"}.</p> : reviewState.eligible ? <ReviewForm productId={product.id} productSlug={product.slug} /> : <p className="mt-3 text-sm text-stone-600">Poți scrie o recenzie după ce o comandă proprie, achitată, care conține produsul a fost expediată.</p>}</div>
      </section>
    </main>
  );
}
