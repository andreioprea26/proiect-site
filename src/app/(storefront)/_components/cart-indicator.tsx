"use client";

import Link from "next/link";

import { useCart } from "./cart-provider";

export function CartIndicator() {
  const { hydrated, itemCount } = useCart();
  const visibleCount = hydrated ? itemCount : 0;

  return (
    <Link
      aria-label={`Coș de cumpărături, ${visibleCount} ${visibleCount === 1 ? "articol" : "articole"}`}
      className="rounded-full border border-brand/20 px-4 py-2 text-sm font-semibold text-brand-strong transition hover:border-brand hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
      href="/cart"
    >
      Coș ({visibleCount})
    </Link>
  );
}
