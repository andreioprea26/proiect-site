import Link from "next/link";

export default function StorefrontNotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-5 py-16 sm:px-8">
      <div className="w-full rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">404</p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-950">Pagina nu a fost găsită</h1>
        <p className="mt-3 text-stone-600">Categoria sau colecția căutată nu există ori nu este publică.</p>
        <Link className="mt-6 inline-flex rounded-full bg-emerald-900 px-5 py-2.5 font-semibold text-white" href="/shop">Înapoi la Magazin</Link>
      </div>
    </main>
  );
}
