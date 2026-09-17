import { getPublicStoreSettings } from "@/lib/store-settings/server";
import { storeTitle } from "@/lib/config/store";
import type { Metadata } from "next";
import Link from "next/link";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getPublicStoreSettings();
  return {
    title: storeTitle("Confirmare e-mail", store),
    description: "Rezultatul confirmării adresei de e-mail.",
    robots: PRIVATE_ROBOTS,
  };
}

type ConfirmationPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function ConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const store = await getPublicStoreSettings();
  const { status } = await searchParams;
  const isSuccess = status === "success";

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-background px-6 py-12 text-brand-text">
      <section className="w-full max-w-md rounded-2xl border border-brand-border/25 bg-brand-surface p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-brand">{store.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {isSuccess ? "E-mail confirmat" : "Confirmarea nu a reușit"}
        </h1>
        <p className="mt-4 text-sm leading-6 text-brand-muted">
          {isSuccess
            ? "Adresa ta de e-mail a fost confirmată. Acum te poți autentifica."
            : "Linkul de confirmare este invalid sau a expirat. Poți încerca din nou folosind cel mai recent e-mail primit."}
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
          href={isSuccess ? "/login" : "/"}
        >
          {isSuccess ? "Mergi la autentificare" : "Înapoi la pagina principală"}
        </Link>
      </section>
    </main>
  );
}
