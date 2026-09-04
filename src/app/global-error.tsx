"use client";

import "./globals.css";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="ro">
      <body>
        <main className="mx-auto flex min-h-screen max-w-3xl items-center px-5 py-16 text-stone-900 sm:px-8">
          <div className="w-full rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <title>Eroare neașteptată | Brand Handmade</title>
            <h1 className="text-3xl font-semibold">A apărut o problemă neașteptată</h1>
            <p className="mt-3 text-stone-600">Datele tale nu au fost trimise din nou. Poți reîncerca încărcarea paginii.</p>
            <button className="mt-6 min-h-11 rounded-full bg-emerald-900 px-5 py-2.5 font-semibold text-white" onClick={retry} type="button">
              Încearcă din nou
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
