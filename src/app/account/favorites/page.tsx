import { listFavorites } from "@/lib/account/favorites";
import { ProductCard } from "@/app/(storefront)/_components/product-card";
import { FavoriteButton } from "@/app/(storefront)/_components/favorite-button";

export default async function FavoritesPage() {
  const favorites = await listFavorites();
  return <section><p className="text-sm font-medium text-emerald-800">Cont client</p><h1 className="mt-2 text-3xl font-semibold">Favorite</h1><p className="mt-3 text-stone-600">Produsele salvate în contul tău.</p>{favorites.length === 0 ? <p className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white p-6 text-stone-600">Nu ai încă produse favorite.</p> : <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{favorites.map((favorite) => favorite.product ? <div className="grid content-start gap-3" key={favorite.productId}><ProductCard product={favorite.product} /><FavoriteButton authenticated initialFavorite productId={favorite.product.id} productSlug={favorite.product.slug} /></div> : <article className="rounded-2xl border border-stone-200 bg-white p-6" key={favorite.productId}><h2 className="font-semibold">Produs indisponibil</h2><p className="mt-2 text-sm text-stone-600">Produsul nu mai este publicat, dar îl poți elimina în siguranță din favorite.</p><div className="mt-4"><FavoriteButton authenticated initialFavorite productId={favorite.productId} productSlug="" /></div></article>)}</div>}</section>;
}
