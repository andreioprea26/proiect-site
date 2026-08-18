import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Confirmare e-mail | Brand Handmade",
  description: "Rezultatul confirmării adresei de e-mail.",
};

type ConfirmationPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function ConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const { status } = await searchParams;
  const isSuccess = status === "success";

  return (
    <main className="flex min-h-screen items-center justify-center bg-amber-50 px-6 py-12 text-stone-800">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-emerald-800">Brand Handmade</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {isSuccess ? "E-mail confirmat" : "Confirmarea nu a reușit"}
        </h1>
        <p className="mt-4 text-sm leading-6 text-stone-600">
          {isSuccess
            ? "Adresa ta de e-mail a fost confirmată. Autentificarea va fi disponibilă într-un task viitor."
            : "Linkul de confirmare este invalid sau a expirat. Poți încerca din nou folosind cel mai recent e-mail primit."}
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          href="/"
        >
          Înapoi la pagina principală
        </Link>
      </section>
    </main>
  );
}
