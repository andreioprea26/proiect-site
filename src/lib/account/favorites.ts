import "server-only";

import { getAccountContext } from "@/lib/account/server";
import type { StorefrontProduct } from "@/lib/storefront/catalog";
import { getStorefrontProductsByIds } from "@/lib/storefront/catalog";

export type FavoriteItem = {
  productId: string;
  createdAt: string;
  product: StorefrontProduct | null;
};

export async function getFavoriteState(productId: string) {
  const context = await getAccountContext();
  if (!context) return { authenticated: false, isFavorite: false };
  const { data, error } = await context.supabase.from("favorites")
    .select("product_id")
    .eq("user_id", context.user.id)
    .eq("product_id", productId)
    .maybeSingle();
  return { authenticated: true, isFavorite: !error && Boolean(data) };
}

export async function listFavorites(): Promise<FavoriteItem[]> {
  const context = await getAccountContext();
  if (!context) return [];
  const { data, error } = await context.supabase.from("favorites")
    .select("product_id, created_at")
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Favoritele nu au putut fi încărcate.");

  const products = await getStorefrontProductsByIds(
    (data ?? []).map((favorite) => favorite.product_id),
  );
  const productById = new Map(products.map((product) => [product.id, product]));
  return (data ?? []).map((favorite) => ({
    productId: favorite.product_id,
    createdAt: favorite.created_at,
    product: productById.get(favorite.product_id) ?? null,
  }));
}
