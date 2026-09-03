import "server-only";

import { getAccountContext } from "@/lib/account/server";
import { requireAdminContext } from "@/lib/admin/server";
import { createClient } from "@/lib/supabase/server";

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type PublicReview = {
  id: string;
  rating: number;
  text: string;
  verifiedPurchase: boolean;
  authorDisplayName: string;
  createdAt: string;
};

export async function getPublicProductReviews(productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_approved_product_reviews", {
    p_product_id: productId,
  });
  // Keep existing product pages available while a newly versioned migration is
  // still waiting for the project's manual Development rollout.
  if (error?.code === "PGRST202") return { reviews: [], averageRating: null };
  if (error) throw new Error("Recenziile nu au putut fi încărcate.");
  const reviews: PublicReview[] = (data ?? []).map((review: Record<string, unknown>) => ({
    id: String(review.id),
    rating: Number(review.rating),
    text: String(review.review_text),
    verifiedPurchase: review.verified_purchase === true,
    authorDisplayName: String(review.author_display_name),
    createdAt: String(review.created_at),
  }));
  return {
    reviews,
    averageRating: reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : null,
  };
}

export async function getCustomerReviewState(productId: string) {
  const context = await getAccountContext();
  if (!context) return { authenticated: false, eligible: false, existingStatus: null };
  const [eligibility, existing] = await Promise.all([
    context.supabase.rpc("can_review_product", { p_product_id: productId }),
    context.supabase.from("reviews").select("status")
      .eq("product_id", productId).eq("user_id", context.user.id).maybeSingle(),
  ]);
  return {
    authenticated: true,
    eligible: !eligibility.error && eligibility.data === true,
    existingStatus: existing.error ? null : (existing.data?.status as ReviewStatus | undefined) ?? null,
  };
}

export async function listAdminReviews(status: ReviewStatus | "") {
  const { supabase } = await requireAdminContext();
  let query = supabase.from("reviews")
    .select("id, product_id, user_id, rating, review_text, verified_purchase, status, author_display_name, moderated_by, moderated_at, created_at, products(name)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error("Recenziile nu au putut fi încărcate pentru moderare.");
  return (data ?? []).map((review) => ({
    id: review.id,
    productId: review.product_id,
    productName: Array.isArray(review.products)
      ? review.products[0]?.name ?? "Produs indisponibil"
      : (review.products as { name?: string } | null)?.name ?? "Produs indisponibil",
    rating: review.rating,
    text: review.review_text,
    verifiedPurchase: review.verified_purchase,
    status: review.status as ReviewStatus,
    authorDisplayName: review.author_display_name,
    moderatedAt: review.moderated_at,
    createdAt: review.created_at,
  }));
}
