import "server-only";

import { requireAdminContext } from "@/lib/admin/server";

export type ContactStatus = "new" | "in_progress" | "closed";
export type CustomRequestStatus = "new" | "reviewing" | "accepted" | "rejected" | "closed";

export async function listNewsletterSubscribers() {
  const { supabase } = await requireAdminContext();
  const { data, error } = await supabase.from("newsletter_subscribers").select("id, email, user_id, is_active, source, consented_at, subscribed_at, unsubscribed_at").order("created_at", { ascending: false });
  if (error) throw new Error("Abonările nu au putut fi încărcate.");
  return data ?? [];
}

export async function listContactRequests() {
  const { supabase } = await requireAdminContext();
  const { data, error } = await supabase.from("contact_requests").select("id, user_id, name, email, category, message, status, internal_note, created_at, updated_at").order("created_at", { ascending: false });
  if (error) throw new Error("Mesajele nu au putut fi încărcate.");
  return data ?? [];
}

export async function listCustomOrderRequests() {
  const { supabase } = await requireAdminContext();
  const { data, error } = await supabase.from("custom_order_requests").select("id, user_id, name, email, description, budget_minor, desired_date, status, internal_note, created_at, updated_at").order("created_at", { ascending: false });
  if (error) throw new Error("Cererile personalizate nu au putut fi încărcate.");
  return data ?? [];
}
