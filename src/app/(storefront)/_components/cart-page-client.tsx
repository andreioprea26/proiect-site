"use client";

import Image from "next/image";
import Link from "next/link";

import {
  formatMoney,
  maxQuantityForLine,
  type CartLine,
} from "@/lib/cart/model";

import { useCart } from "./cart-provider";

export function CartPageClient() {
  const {
    clearCart,
    hydrated,
    itemCount,
    lines,
    removeLine,
    subtotalMinor,
    updateQuantity,
  } = useCart();

  if (!hydrated) {
    return (
      <p aria-live="polite" className="mt-10 text-stone-600">
        Se încarcă coșul…
      </p>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mt-10 rounded-3xl border border-dashed border-stone-300 bg-white/70 px-6 py-12 text-center">
        <h2 className="text-2xl font-semibold text-stone-900">Coșul este gol</h2>
        <p className="mx-auto mt-3 max-w-xl text-stone-600">
          Descoperă produsele handmade și configurează varianta potrivită.
        </p>
        <Link
          className="mt-6 inline-flex rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          href="/shop"
        >
          Înapoi la Magazin
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <section aria-labelledby="cart-lines" className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold" id="cart-lines">
            Produse ({itemCount})
          </h2>
          <button
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            onClick={clearCart}
            type="button"
          >
            Golește coșul
          </button>
        </div>
        <div aria-live="polite" className="grid gap-4">
          {lines.map((line) => (
            <CartLineCard
              key={line.key}
              line={line}
              onRemove={() => removeLine(line.key)}
              onUpdateQuantity={(quantity) =>
                updateQuantity(line.key, quantity)
              }
            />
          ))}
        </div>
      </section>

      <aside className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Sumar coș</h2>
        <div className="mt-5 flex items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <span className="text-stone-600">Subtotal estimativ</span>
          <strong className="text-xl text-emerald-900" data-testid="cart-subtotal">
            {formatMoney(subtotalMinor)}
          </strong>
        </div>
        <p className="mt-5 text-sm leading-6 text-stone-600">
          Produsele, configurațiile, prețurile, disponibilitatea și stocul vor fi
          validate din nou pe server la checkout. Transportul nu este inclus.
        </p>
        <button
          className="mt-6 min-h-12 w-full cursor-not-allowed rounded-full bg-stone-200 px-5 py-3 font-semibold text-stone-500"
          disabled
          type="button"
        >
          Checkout disponibil în pasul următor
        </button>
        <Link
          className="mt-4 flex justify-center text-sm font-semibold text-emerald-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          href="/shop"
        >
          Continuă cumpărăturile
        </Link>
      </aside>
    </div>
  );
}

function CartLineCard({
  line,
  onRemove,
  onUpdateQuantity,
}: {
  line: CartLine;
  onRemove: () => void;
  onUpdateQuantity: (quantity: number) => void;
}) {
  const maximum = maxQuantityForLine(line);

  return (
    <article
      className="grid gap-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:grid-cols-[8rem_minmax(0,1fr)]"
      data-testid="cart-line"
    >
      <Link
        aria-label={`Vezi produsul ${line.name}`}
        className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 via-rose-50 to-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        href={`/products/${line.slug}`}
      >
        {line.image ? (
          <Image
            alt={line.image.altText ?? line.name}
            className="object-cover"
            fill
            sizes="128px"
            src={line.image.url}
          />
        ) : (
          <span className="flex h-full items-center justify-center px-3 text-center text-xs font-medium text-stone-500">
            Imagine în pregătire
          </span>
        )}
      </Link>

      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-stone-950">
              <Link className="hover:underline" href={`/products/${line.slug}`}>
                {line.name}
              </Link>
            </h3>
            {line.variant ? (
              <p className="mt-1 text-sm text-stone-600">
                Variantă: <strong>{line.variant.title}</strong>
              </p>
            ) : null}
          </div>
          <button
            aria-label={`Elimină ${line.name} din coș`}
            className="text-sm font-semibold text-red-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            onClick={onRemove}
            type="button"
          >
            Elimină
          </button>
        </div>

        {line.customizations.length > 0 ? (
          <dl className="mt-4 grid gap-1 text-sm text-stone-600">
            {line.customizations.map((customization) => (
              <div className="flex flex-wrap gap-1" key={customization.id}>
                <dt>{customization.name}:</dt>
                <dd className="font-medium text-stone-800">
                  {customization.displayValue}
                  {customization.additionalCostMinor > 0
                    ? ` (+ ${formatMoney(customization.additionalCostMinor)})`
                    : ""}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-5 flex flex-wrap items-end justify-between gap-5 border-t border-stone-100 pt-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Cantitate
            </p>
            <div className="flex items-center gap-2">
              <button
                aria-label={`Scade cantitatea pentru ${line.name}`}
                className="size-10 rounded-full border border-stone-300 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                disabled={line.quantity <= 1}
                onClick={() => onUpdateQuantity(line.quantity - 1)}
                type="button"
              >
                −
              </button>
              <input
                aria-label={`Cantitate pentru ${line.name}`}
                className="h-10 w-16 rounded-xl border border-stone-300 text-center outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                max={maximum}
                min="1"
                onChange={(event) => {
                  if (!Number.isNaN(event.target.valueAsNumber)) {
                    onUpdateQuantity(event.target.valueAsNumber);
                  }
                }}
                type="number"
                value={line.quantity}
              />
              <button
                aria-label={`Crește cantitatea pentru ${line.name}`}
                className="size-10 rounded-full border border-stone-300 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                disabled={line.quantity >= maximum}
                onClick={() => onUpdateQuantity(line.quantity + 1)}
                type="button"
              >
                +
              </button>
            </div>
            {maximum === 1 ? (
              <p className="mt-2 text-xs text-stone-500">Un singur exemplar disponibil.</p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-sm text-stone-600">
              {formatMoney(line.unitPriceMinor)} / buc.
            </p>
            <p className="mt-1 font-semibold text-emerald-900" data-testid="line-subtotal">
              {formatMoney(line.unitPriceMinor * line.quantity)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
