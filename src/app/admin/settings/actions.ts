"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/lib/admin/server";
import { normalizeSettings, SETTING_KEYS, type SettingsErrors } from "@/lib/store-settings/model";

export type SettingsActionState = { success: boolean; message: string; errors: SettingsErrors };

export async function saveStoreSettings(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const { supabase } = await requireAdminContext();
  const { values, errors } = normalizeSettings(Object.fromEntries(SETTING_KEYS.map((key) => [key, formData.get(key)])));
  if (Object.keys(errors).length) return { success: false, message: "Verifică valorile introduse. Linkurile sociale acceptă doar HTTPS pe platforma indicată, fără query sau fragment.", errors };
  const { data, error } = await supabase.rpc("save_store_settings", Object.fromEntries(SETTING_KEYS.map((key) => [`p_${key}`, values[key]])));
  if (error || !data?.success) return { success: false, message: "Setările nu au putut fi salvate. Încearcă din nou.", errors: {} };
  revalidatePath("/", "layout");
  return { success: true, message: "Setările au fost salvate. Identitatea publică este actualizată.", errors: {} };
}
