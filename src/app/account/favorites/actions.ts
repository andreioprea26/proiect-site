"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAccountContext } from "@/lib/account/server";

export type FavoriteActionState = {
  isFavorite: boolean;
  message: string | null;
  success: boolean;
};

export async function setFavorite(
  previousState: FavoriteActionState,
  formData: FormData,
): Promise<FavoriteActionState> {
  const productId = String(formData.get("productId") ?? "");
  const desired = String(formData.get("desired")) === "true";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
    return { ...previousState, message: "Produs invalid.", success: false };
  }

  const context = await getAccountContext();
  if (!context) redirect(`/login?next=${encodeURIComponent(`/products/${String(formData.get("productSlug") ?? "")}`)}`);

  const result = desired
    ? await context.supabase.from("favorites").upsert(
      { user_id: context.user.id, product_id: productId },
      { onConflict: "user_id,product_id", ignoreDuplicates: true },
    )
    : await context.supabase.from("favorites").delete()
      .eq("user_id", context.user.id).eq("product_id", productId);

  if (result.error) {
    return {
      isFavorite: previousState.isFavorite,
      message: "Favoritele nu au putut fi actualizate.",
      success: false,
    };
  }
  revalidatePath("/account/favorites");
  revalidatePath("/shop");
  return {
    isFavorite: desired,
    message: desired ? "Produs adăugat la favorite." : "Produs eliminat din favorite.",
    success: true,
  };
}
