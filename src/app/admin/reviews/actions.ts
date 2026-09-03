"use server";

import { revalidatePath } from "next/cache";

import { requireAdminContext } from "@/lib/admin/server";
import type { ReviewStatus } from "@/lib/reviews/server";

export async function moderateReview(formData: FormData) {
  const reviewId = String(formData.get("reviewId") ?? "");
  const status = String(formData.get("status") ?? "") as ReviewStatus;
  if (!/^[0-9a-f-]{36}$/i.test(reviewId) || !["approved", "rejected"].includes(status)) return;
  const { supabase } = await requireAdminContext();
  const { data, error } = await supabase.rpc("moderate_product_review", {
    p_review_id: reviewId,
    p_status: status,
  });
  if (error || !(data as { success?: boolean } | null)?.success) return;
  revalidatePath("/admin/reviews");
  revalidatePath("/products", "layout");
}
