"use client";

import Link from "next/link";
import { useActionState } from "react";

import { setFavorite, type FavoriteActionState } from "@/app/account/favorites/actions";

export function FavoriteButton({
  authenticated,
  initialFavorite,
  productId,
  productSlug,
}: {
  authenticated: boolean;
  initialFavorite: boolean;
  productId: string;
  productSlug: string;
}) {
  const initialState: FavoriteActionState = {
    isFavorite: initialFavorite,
    message: null,
    success: true,
  };
  const [state, action, pending] = useActionState(setFavorite, initialState);

  if (!authenticated) {
    return (
      <Link className="inline-flex rounded-full border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-900" href="/login">
        ♡ Autentifică-te pentru favorite
      </Link>
    );
  }

  return (
    <div>
      <form action={action}>
        <input name="productId" type="hidden" value={productId} />
        <input name="productSlug" type="hidden" value={productSlug} />
        <input name="desired" type="hidden" value={String(!state.isFavorite)} />
        <button
          aria-pressed={state.isFavorite}
          className="rounded-full border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-900 disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Se actualizează…" : state.isFavorite ? "♥ În favorite" : "♡ Adaugă la favorite"}
        </button>
      </form>
      {state.message ? <p aria-live="polite" className="mt-2 text-xs text-stone-600">{state.message}</p> : null}
    </div>
  );
}
