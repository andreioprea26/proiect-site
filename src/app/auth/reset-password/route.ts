import { NextResponse } from "next/server";

import { isRecoveryClaim } from "@/lib/auth/password-reset";
import { getAppUrl } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";

const PASSWORD_RESET_PATH = "/reset-password";

function resetResultUrl(status: "error" | "ready") {
  const resultUrl = new URL(PASSWORD_RESET_PATH, getAppUrl());
  resultUrl.searchParams.set("status", status);

  return resultUrl;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code")?.trim();
  const flowId = requestUrl.searchParams.get("sb_flow_id")?.trim();

  if (!code) {
    return NextResponse.redirect(resetResultUrl("error"));
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );

    if (error || !data.session) {
      return NextResponse.redirect(resetResultUrl("error"));
    }

    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(data.session.access_token);

    if (
      claimsError ||
      !claimsData ||
      !isRecoveryClaim(claimsData.claims)
    ) {
      await supabase.auth.signOut({ scope: "local" });
      return NextResponse.redirect(resetResultUrl("error"));
    }

    return NextResponse.redirect(resetResultUrl("ready"));
  } catch {
    return NextResponse.redirect(resetResultUrl("error"));
  }
}
