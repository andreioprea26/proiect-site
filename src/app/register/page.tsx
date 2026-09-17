import { getPublicStoreSettings } from "@/lib/store-settings/server";
import { storeText, storeTitle } from "@/lib/config/store";
import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "./register-form";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getPublicStoreSettings();
  return {
    title: storeTitle("Înregistrare", store),
    description: storeText(store).registerDescription,
    robots: PRIVATE_ROBOTS,
  };
}

export default async function RegisterPage() {
  const store = await getPublicStoreSettings();
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-background px-6 py-12 text-brand-text">
      <section className="w-full max-w-md rounded-2xl border border-brand-border/25 bg-brand-surface p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-brand">{store.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Creează un cont
        </h1>
        <p className="mt-3 text-sm leading-6 text-brand-muted">
          Completează datele de mai jos. Dacă este necesară confirmarea
          adresei, vei primi instrucțiuni prin e-mail.
        </p>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-brand-muted">
          Ai deja cont?{" "}
          <Link
            className="font-medium text-brand underline-offset-4 hover:underline"
            href="/login"
          >
            Autentifică-te
          </Link>
        </p>
      </section>
    </main>
  );
}
