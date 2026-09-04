"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAccountContext } from "@/lib/account/server";

export type ReviewActionState = {
  message: string | null;
  success: boolean;
};

const REVIEW_MESSAGES: Record<string, string> = {
  duplicate_review: "Ai trimis deja o recenzie pentru acest produs.",
  invalid_review: "Alege un rating și scrie între 10 și 2.000 de caractere.",
  not_eligible: "Recenzia poate fi trimisă numai după o achiziție eligibilă.",
};

const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function submitReview(
  _previousState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const context = await getAccountContext();
  if (!context) redirect("/login");
  const productId = String(formData.get("productId") ?? "");
  const productSlug = String(formData.get("productSlug") ?? "");
  const rating = Number(formData.get("rating"));
  const reviewText = String(formData.get("reviewText") ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || reviewText.length < 10 || reviewText.length > 2000) {
    return { message: REVIEW_MESSAGES.invalid_review, success: false };
  }
  const { data, error } = await context.supabase.rpc("submit_verified_review", {
    p_product_id: productId,
    p_rating: rating,
    p_review_text: reviewText,
  });
  const result = data as { success?: boolean; code?: string } | null;
  if (error || !result?.success) {
    return {
      message: REVIEW_MESSAGES[result?.code ?? ""] ?? "Recenzia nu a putut fi trimisă.",
      success: false,
    };
  }
  if (productSlug.length <= 100 && PRODUCT_SLUG_PATTERN.test(productSlug)) {
    revalidatePath(`/products/${productSlug}`);
  } else {
    revalidatePath("/products");
  }
  revalidatePath("/admin/reviews");
  return { message: "Recenzia a fost trimisă și așteaptă moderarea.", success: true };
}
