"use server";

import { createClient } from "@/lib/supabase/server";
import { cleanText, looksAutomated, normalizeEmail, validEmail } from "@/lib/engagement/validation";

export type ContactActionState = { message: string | null; success: boolean };
const CATEGORIES = ["general", "order", "product", "complaint", "other"];

export async function submitContact(_state: ContactActionState, formData: FormData): Promise<ContactActionState> {
  if (looksAutomated(formData)) return { message: "Mesajul nu a putut fi trimis. Reîncearcă peste câteva secunde.", success: false };
  const name = cleanText(formData.get("name"));
  const email = normalizeEmail(formData.get("email"));
  const category = cleanText(formData.get("category"));
  const message = cleanText(formData.get("message"));
  if (name.length < 2 || name.length > 100 || !validEmail(email) || !CATEGORIES.includes(category) || message.length < 20 || message.length > 4000) {
    return { message: "Verifică numele, e-mailul, categoria și mesajul (minimum 20 de caractere).", success: false };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_contact_request", { p_name: name, p_email: email, p_category: category, p_message: message });
  if (error || !(data as { success?: boolean } | null)?.success) return { message: "Mesajul nu a putut fi trimis. Încearcă din nou.", success: false };
  return { message: "Mesajul a fost înregistrat. Îți vom răspunde folosind adresa furnizată.", success: true };
}
