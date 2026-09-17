import { getPublicStoreSettings } from "@/lib/store-settings/server";
import { storeTitle } from "@/lib/config/store";
import type { Metadata } from "next";
import Link from "next/link";

import { isRecoveryClaim } from "@/lib/auth/password-reset";
import { createClient } from "@/lib/supabase/server";
import { PRIVATE_ROBOTS } from "@/lib/seo";

import { ResetPasswordForm } from "./reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getPublicStoreSettings();
  return {
    title: storeTitle("Parolă nouă", store),
    description: "Alege o parolă nouă pentru contul tău.",
    robots: PRIVATE_ROBOTS,
  };
}

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
  const store = await getPublicStoreSettings();
  const canResetPassword = await hasRecoverySession();

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-background px-6 py-12 text-brand-text">
      <section className="w-full max-w-md rounded-2xl border border-brand-border/25 bg-brand-surface p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-brand">{store.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Alege o parolă nouă
        </h1>
        {canResetPassword ? (
          <>
            <p className="mt-3 text-sm leading-6 text-brand-muted">
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
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground transition hover:bg-brand-hover"
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
