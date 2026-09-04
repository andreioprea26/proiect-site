"use server";

import { createClient } from "@/lib/supabase/server";
import { cleanText, looksAutomated, normalizeEmail, validEmail } from "@/lib/engagement/validation";

export type CustomRequestActionState = { message: string | null; success: boolean };

export async function submitCustomRequest(_state: CustomRequestActionState, formData: FormData): Promise<CustomRequestActionState> {
  if (looksAutomated(formData)) return { message: "Cererea nu a putut fi trimisă. Reîncearcă peste câteva secunde.", success: false };
  const name = cleanText(formData.get("name"));
  const email = normalizeEmail(formData.get("email"));
  const description = cleanText(formData.get("description"));
  const budgetRaw = cleanText(formData.get("budget"));
  const budget = budgetRaw ? Number(budgetRaw.replace(",", ".")) : null;
  const budgetMinor = budget === null ? null : Math.round(budget * 100);
  const desiredDate = cleanText(formData.get("desiredDate")) || null;
  if (name.length < 2 || name.length > 100 || !validEmail(email) || description.length < 30 || description.length > 5000 || (budget !== null && (!Number.isFinite(budget) || budget < 0 || budget > 1_000_000))) {
    return { message: "Verifică numele, e-mailul, descrierea și bugetul orientativ.", success: false };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_custom_order_request", { p_name: name, p_email: email, p_description: description, p_budget_minor: budgetMinor, p_desired_date: desiredDate });
  if (error || !(data as { success?: boolean } | null)?.success) return { message: "Cererea nu a putut fi trimisă. Încearcă din nou.", success: false };
  return { message: "Cererea a fost înregistrată pentru analiză. Nu a fost creată nicio comandă sau plată.", success: true };
}
