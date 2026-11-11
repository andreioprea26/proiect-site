"use client";

import Link from "next/link";

import { useCart } from "./cart-provider";

export function CartIndicator() {
  const { hydrated, itemCount } = useCart();
  const visibleCount = hydrated ? itemCount : 0;

  return (
    <Link
      aria-label={`Coș de cumpărături, ${visibleCount} ${visibleCount === 1 ? "articol" : "articole"}`}
      className="rounded-full border border-emerald-900/20 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:border-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
      href="/cart"
    >
      Coș ({visibleCount})
    </Link>
  );
}
