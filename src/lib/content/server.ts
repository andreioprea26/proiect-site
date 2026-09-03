import "server-only";

import { requireAdminContext } from "@/lib/admin/server";
import { createClient } from "@/lib/supabase/server";

export type ContentStatus = "draft" | "published";
export type ContentPage = { id: string; slug: string; title: string; content: string; status: ContentStatus; publishedAt: string | null; updatedAt: string };

export async function listPublishedContentPages() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("content_pages").select("id, slug, title, content, status, published_at, updated_at").eq("status", "published").order("title");
  if (error?.code === "PGRST205") return [];
  if (error) throw new Error("Paginile informative nu au putut fi încărcate.");
  return (data ?? []).map(mapPage);
}

export async function getPublishedContentPage(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("content_pages").select("id, slug, title, content, status, published_at, updated_at").eq("slug", slug).eq("status", "published").maybeSingle();
  if (error?.code === "PGRST205") return null;
  if (error) throw new Error("Pagina informativă nu a putut fi încărcată.");
  return data ? mapPage(data) : null;
}

export async function listAdminContentPages() {
  const { supabase } = await requireAdminContext();
  const { data, error } = await supabase.from("content_pages").select("id, slug, title, content, status, published_at, updated_at").order("title");
  if (error) throw new Error("Conținutul nu a putut fi încărcat.");
  return (data ?? []).map(mapPage);
}

function mapPage(page: Record<string, unknown>): ContentPage { return { id: String(page.id), slug: String(page.slug), title: String(page.title), content: String(page.content), status: page.status as ContentStatus, publishedAt: page.published_at ? String(page.published_at) : null, updatedAt: String(page.updated_at) }; }
