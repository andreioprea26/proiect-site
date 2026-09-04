import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-5 py-16 text-stone-900 sm:px-8">
      <div className="w-full rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">404</p>
        <h1 className="mt-3 text-3xl font-semibold">Pagina nu a fost găsită</h1>
        <p className="sr-only" lang="en">This page could not be found</p>
        <p className="mt-3 text-stone-600">Adresa accesată nu există sau nu mai este disponibilă.</p>
        <Link className="mt-6 inline-flex min-h-11 items-center rounded-full bg-emerald-900 px-5 py-2.5 font-semibold text-white" href="/">
          Înapoi la pagina principală
        </Link>
      </div>
    </main>
  );
}
