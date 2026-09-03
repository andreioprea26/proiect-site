"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/lib/admin/server";
import type { ContentStatus } from "@/lib/content/server";

export async function saveContentPage(formData: FormData) {
  const idValue = String(formData.get("id") ?? "");
  const id = idValue && /^[0-9a-f-]{36}$/i.test(idValue) ? idValue : null;
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const status = String(formData.get("status") ?? "") as ContentStatus;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100 || title.length < 2 || title.length > 120 || content.length < 1 || content.length > 20000 || !["draft", "published"].includes(status)) return;
  const { supabase } = await requireAdminContext();
  const { data, error } = await supabase.rpc("upsert_content_page", { p_id: id, p_slug: slug, p_title: title, p_content: content, p_status: status });
  if (error || !(data as { success?: boolean } | null)?.success) return;
  revalidatePath("/admin/content");
  revalidatePath("/info", "layout");
}
