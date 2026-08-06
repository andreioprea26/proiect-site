import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnvironmentVariables } from "@/lib/config/env";

export function createClient() {
  const { url, publishableKey } = getSupabasePublicEnvironmentVariables();

  return createBrowserClient(url, publishableKey);
}
