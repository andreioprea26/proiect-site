"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/lib/admin/server";

export async function setNewsletterStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active")) === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const { supabase } = await requireAdminContext();
  const { data, error } = await supabase.rpc("manage_newsletter_subscription", { p_id: id, p_active: active });
  if (error || !(data as { success?: boolean } | null)?.success) return;
  revalidatePath("/admin/newsletter");
}
