import type { Metadata } from "next";

import { CartPageClient } from "../_components/cart-page-client";

export const metadata: Metadata = {
  title: "Coș",
  description: "Produsele și configurațiile selectate pentru cumpărare.",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
          Selecția ta
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Coș de cumpărături
        </h1>
        <p className="mt-5 text-lg leading-8 text-stone-600">
          Coșul păstrează o estimare pentru confortul tău și nu reprezintă încă
          o comandă.
        </p>
      </header>
      <CartPageClient />
    </main>
  );
}
