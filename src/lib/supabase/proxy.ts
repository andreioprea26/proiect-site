import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnvironmentVariables } from "@/lib/config/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, publishableKey } = getSupabasePublicEnvironmentVariables();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) =>
          supabaseResponse.headers.set(name, value),
        );
      },
    },
  });

  try {
    await supabase.auth.getClaims();
  } catch {
    // A missing, invalid, or temporarily unverifiable session must not make
    // public routes unavailable. No identity is trusted from this failure.
  }

  return supabaseResponse;
}
