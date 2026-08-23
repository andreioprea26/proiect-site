"use client";

export default function StorefrontError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-5 py-16 sm:px-8">
      <div className="w-full rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-semibold text-stone-950">Magazinul nu poate fi încărcat momentan</h1>
        <p className="mt-3 text-stone-600">Încearcă din nou peste câteva momente.</p>
        <button
          className="mt-6 rounded-full bg-emerald-900 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          onClick={reset}
          type="button"
        >
          Încearcă din nou
        </button>
      </div>
    </main>
  );
}
