"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/lib/admin/server";
import type { CustomRequestStatus } from "@/lib/admin/engagement";

export async function updateCustomRequest(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as CustomRequestStatus;
  const note = String(formData.get("internalNote") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["new", "reviewing", "accepted", "rejected", "closed"].includes(status) || note.length > 4000) return;
  const { supabase } = await requireAdminContext();
  const { data, error } = await supabase.rpc("manage_custom_order_request", { p_id: id, p_status: status, p_internal_note: note });
  if (error || !(data as { success?: boolean } | null)?.success) return;
  revalidatePath("/admin/custom-requests");
}
