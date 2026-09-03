"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeEmail, validEmail } from "@/lib/engagement/validation";

export type PublicActionState = { message: string | null; success: boolean };

export async function subscribeNewsletter(_state: PublicActionState, formData: FormData): Promise<PublicActionState> {
  const email = normalizeEmail(formData.get("email"));
  const source = String(formData.get("source")) === "homepage" ? "homepage" : "footer";
  if (!validEmail(email)) return { message: "Introdu o adresă de e-mail validă.", success: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("subscribe_newsletter", { p_email: email, p_source: source });
  if (error || !(data as { success?: boolean } | null)?.success) return { message: "Abonarea nu a putut fi salvată. Încearcă din nou.", success: false };
  return { message: "Dacă adresa este eligibilă, abonarea a fost înregistrată.", success: true };
}
