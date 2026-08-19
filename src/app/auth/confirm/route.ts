import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const CONFIRMATION_PATH = "/auth/confirmed";

function confirmationResultUrl(requestUrl: URL, status: "error" | "success") {
  const resultUrl = new URL(CONFIRMATION_PATH, requestUrl.origin);
  resultUrl.searchParams.set("status", status);

  return resultUrl;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash")?.trim();
  const type = requestUrl.searchParams.get("type");
  const code = requestUrl.searchParams.get("code")?.trim();
  const flowId = requestUrl.searchParams.get("sb_flow_id")?.trim();

  const hasTokenHashConfirmation = Boolean(tokenHash) && type === "email";
  const hasCodeConfirmation = Boolean(code) && !tokenHash && !type;

  if (!hasTokenHashConfirmation && !hasCodeConfirmation) {
    return NextResponse.redirect(confirmationResultUrl(requestUrl, "error"));
  }

  try {
    const supabase = await createClient();
    const { error } = hasTokenHashConfirmation
      ? await supabase.auth.verifyOtp({
          token_hash: tokenHash!,
          type: "email",
        })
      : await supabase.auth.exchangeCodeForSession(
          code!,
          flowId ? { flowId } : undefined,
        );

    return NextResponse.redirect(
      confirmationResultUrl(requestUrl, error ? "error" : "success"),
    );
  } catch {
    return NextResponse.redirect(confirmationResultUrl(requestUrl, "error"));
  }
}
