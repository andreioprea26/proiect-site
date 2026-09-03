"use client";

import { useActionState } from "react";

import { submitReview, type ReviewActionState } from "@/app/account/reviews/actions";

const INITIAL_STATE: ReviewActionState = { message: null, success: false };

export function ReviewForm({ productId, productSlug }: { productId: string; productSlug: string }) {
  const [state, action, pending] = useActionState(submitReview, INITIAL_STATE);
  return (
    <form action={action} className="mt-5 grid gap-4 rounded-2xl border border-stone-200 bg-white p-5" noValidate>
      <input name="productId" type="hidden" value={productId} />
      <input name="productSlug" type="hidden" value={productSlug} />
      <div>
        <label className="text-sm font-semibold" htmlFor="review-rating">Rating</label>
        <select className="mt-2 block rounded-lg border border-stone-300 bg-white px-3 py-2" defaultValue="5" id="review-rating" name="rating">
          <option value="5">5 stele</option><option value="4">4 stele</option><option value="3">3 stele</option><option value="2">2 stele</option><option value="1">1 stea</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-semibold" htmlFor="review-text">Recenzia ta</label>
        <textarea className="mt-2 min-h-32 w-full rounded-lg border border-stone-300 px-3 py-2" id="review-text" maxLength={2000} minLength={10} name="reviewText" required />
      </div>
      {state.message ? <p aria-live="polite" className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{state.message}</p> : null}
      {!state.success ? <button className="w-fit rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Se trimite…" : "Trimite recenzia"}</button> : null}
    </form>
  );
}
