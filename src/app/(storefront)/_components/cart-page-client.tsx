"use client";

import { STORE_CONFIG } from "@/lib/config/store";

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
      <p aria-live="polite" className="mt-10 text-brand-muted">
        Se încarcă coșul…
      </p>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mt-10 rounded-3xl border border-dashed border-brand-border bg-brand-surface/70 px-6 py-12 text-center">
        <h2 className="text-2xl font-semibold text-brand-text">Coșul este gol</h2>
        <p className="mx-auto mt-3 max-w-xl text-brand-muted">
          {STORE_CONFIG.copy.emptyCart}
        </p>
        <Link
          className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
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
            className="rounded-full border border-brand-border px-4 py-2 text-sm font-semibold text-brand-muted transition hover:border-red-300 hover:bg-red-50 hover:text-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
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

      <aside className="rounded-3xl border border-brand-border/25 bg-brand-surface p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Sumar coș</h2>
        <div className="mt-5 flex items-center justify-between gap-4 border-b border-brand-border/25 pb-5">
          <span className="text-brand-muted">Subtotal estimativ</span>
          <strong className="text-xl text-brand" data-testid="cart-subtotal">
            {formatMoney(subtotalMinor)}
          </strong>
        </div>
        <p className="mt-5 text-sm leading-6 text-brand-muted">
          Produsele, configurațiile, prețurile, disponibilitatea și stocul vor fi
          validate din nou pe server la checkout. Transportul nu este inclus.
        </p>
        <Link
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-brand px-5 py-3 font-semibold text-brand-foreground transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
          href="/checkout"
        >
          Continuă la checkout
        </Link>
        <Link
          className="mt-4 flex justify-center text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
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
      className="grid gap-5 rounded-3xl border border-brand-border/25 bg-brand-surface p-5 shadow-sm sm:grid-cols-[8rem_minmax(0,1fr)]"
      data-testid="cart-line"
    >
      <Link
        aria-label={`Vezi produsul ${line.name}`}
        className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-brand-accent via-brand-background to-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
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
            <h3 className="text-lg font-semibold text-brand-text">
              <Link className="hover:underline" href={`/products/${line.slug}`}>
                {line.name}
              </Link>
            </h3>
            {line.variant ? (
              <p className="mt-1 text-sm text-brand-muted">
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
          <dl className="mt-4 grid gap-1 text-sm text-brand-muted">
            {line.customizations.map((customization) => (
              <div className="flex flex-wrap gap-1" key={customization.id}>
                <dt>{customization.name}:</dt>
                <dd className="font-medium text-brand-text">
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
                className="size-10 rounded-full border border-brand-border font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                disabled={line.quantity <= 1}
                onClick={() => onUpdateQuantity(line.quantity - 1)}
                type="button"
              >
                −
              </button>
              <input
                aria-label={`Cantitate pentru ${line.name}`}
                className="h-10 w-16 rounded-xl border border-brand-border text-center outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/25"
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
                className="size-10 rounded-full border border-brand-border font-semibold disabled:cursor-not-allowed disabled:opacity-40"
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
            <p className="text-sm text-brand-muted">
              {formatMoney(line.unitPriceMinor)} / buc.
            </p>
            <p className="mt-1 font-semibold text-brand" data-testid="line-subtotal">
              {formatMoney(line.unitPriceMinor * line.quantity)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
