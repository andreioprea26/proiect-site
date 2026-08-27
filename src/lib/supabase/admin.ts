import "server-only";

import { createClient } from "@supabase/supabase-js";

import {
  getSupabasePublicEnvironmentVariables,
  readRequiredServerEnvironmentVariable,
} from "@/lib/config/env";

export function createAdminClient() {
  const { url } = getSupabasePublicEnvironmentVariables();
  const serviceRoleKey = readRequiredServerEnvironmentVariable(
    "SUPABASE_SERVICE_ROLE_KEY",
  );

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
