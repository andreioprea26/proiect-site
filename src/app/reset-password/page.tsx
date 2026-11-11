import type { Metadata } from "next";
import Link from "next/link";

import { isRecoveryClaim } from "@/lib/auth/password-reset";
import { createClient } from "@/lib/supabase/server";
import { PRIVATE_ROBOTS } from "@/lib/seo";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Parolă nouă | Brand Handmade",
  description: "Alege o parolă nouă pentru contul tău.",
  robots: PRIVATE_ROBOTS,
};

async function hasRecoverySession(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();

    return !error && Boolean(data && isRecoveryClaim(data.claims));
  } catch {
    return false;
  }
}

export default async function ResetPasswordPage() {
  const canResetPassword = await hasRecoverySession();

  return (
    <main className="flex min-h-screen items-center justify-center bg-amber-50 px-6 py-12 text-stone-800">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-emerald-800">Brand Handmade</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Alege o parolă nouă
        </h1>
        {canResetPassword ? (
          <>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Introdu și confirmă noua parolă a contului tău.
            </p>
            <ResetPasswordForm />
          </>
        ) : (
          <>
            <p
              className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800"
              role="alert"
            >
              Linkul de resetare este invalid sau a expirat. Solicită un link nou.
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
              href="/forgot-password"
            >
              Solicită un link nou
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
