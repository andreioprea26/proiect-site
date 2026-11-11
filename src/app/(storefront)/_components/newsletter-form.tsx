"use client";

import { useActionState } from "react";

import { subscribeNewsletter, type PublicActionState } from "../newsletter/actions";

const INITIAL_STATE: PublicActionState = { message: null, success: false };

export function NewsletterForm({ source = "footer" }: { source?: "footer" | "homepage" }) {
  const [state, action, pending] = useActionState(subscribeNewsletter, INITIAL_STATE);
  return (
    <form action={action} className="mt-4 grid gap-3" noValidate>
      <input name="source" type="hidden" value={source} />
      <label className="text-sm font-semibold" htmlFor={`newsletter-email-${source}`}>Newsletter</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className="min-w-0 flex-1 rounded-lg border border-emerald-700 bg-emerald-950 px-3 py-2 text-sm text-white placeholder:text-emerald-200/60" id={`newsletter-email-${source}`} name="email" placeholder="adresa@exemplu.ro" type="email" required />
        <button className="rounded-lg bg-amber-200 px-4 py-2 text-sm font-semibold text-stone-900 disabled:opacity-60" disabled={pending} type="submit">{pending ? "Se salvează…" : "Mă abonez"}</button>
      </div>
      <p className="text-xs leading-5 text-emerald-100/70">Abonarea este voluntară și separată de crearea contului.</p>
      {state.message ? <p aria-live="polite" className={`rounded-lg p-2 text-sm ${state.success ? "bg-emerald-800 text-white" : "bg-red-950 text-red-100"}`}>{state.message}</p> : null}
    </form>
  );
}
