import "server-only";

import { cache } from "react";
import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnvironmentVariables } from "@/lib/config/env";
import { requireAdminContext } from "@/lib/admin/server";
import { loadPublicSettings, normalizeSettings, SETTING_KEYS } from "./model";

/** Fresh per request, shared by metadata/layout/pages. Never caches an outage globally. */
export const getPublicStoreSettings = cache(async () => {
  await connection();
  return loadPublicSettings(async () => {
    const { url, publishableKey } = getSupabasePublicEnvironmentVariables();
    const client = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    });
    const { data, error } = await client.rpc("get_public_store_settings")
      .abortSignal(AbortSignal.timeout(2000));
    if (error) throw new Error("store_settings_unavailable");
    return data?.[0] ?? null;
  });
});

/** Admin reads fail visibly; an outage must not look like an empty editable row. */
export async function getAdminStoreSettings() {
  const { supabase } = await requireAdminContext();
  const { data, error } = await supabase.from("store_settings").select(SETTING_KEYS.join(",")).eq("singleton", true).maybeSingle();
  return { values: normalizeSettings(data).values, available: !error };
}
