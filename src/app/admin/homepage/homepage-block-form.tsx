"use client";

import { useActionState } from "react";

import type { HomepageBlock } from "@/lib/homepage/server";

import {
  saveHomepageBlock,
  type HomepageActionState,
} from "./actions";

const HOMEPAGE_ACTION_INITIAL_STATE: HomepageActionState = {
  success: false,
  message: "",
};

const SLOT_LABELS: Record<HomepageBlock["slot"], string> = {
  hero: "Hero principal",
  categories: "Categorii",
  products: "Produse recente",
  collections: "Colecții",
  promo: "Banner promoțional",
};

export function HomepageBlockForm({ block }: { block: HomepageBlock }) {
  const [state, action, pending] = useActionState(
    saveHomepageBlock,
    HOMEPAGE_ACTION_INITIAL_STATE,
  );

  return (
    <form action={action} className="grid gap-4 rounded-2xl border border-stone-800 bg-stone-900 p-6">
      <input name="slot" type="hidden" value={block.slot} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{SLOT_LABELS[block.slot]}</h2>
          <p className="mt-1 text-xs text-stone-500">
            {block.isConfigured ? "Configurat în Development" : "Folosește fallback-ul aplicației"}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input className="size-4 accent-emerald-600" defaultChecked={block.isActive} name="isActive" type="checkbox" />
          Activ
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Supratitlu">
          <input className={inputClass} defaultValue={block.eyebrow ?? ""} maxLength={80} name="eyebrow" />
        </Field>
        <Field label="Ordine">
          <input className={inputClass} defaultValue={block.displayOrder} max={100} min={0} name="displayOrder" required type="number" />
        </Field>
      </div>
      <Field label="Titlu">
        <input className={inputClass} defaultValue={block.title} maxLength={120} minLength={2} name="title" required />
      </Field>
      <Field label="Subtitlu">
        <textarea className={`${inputClass} min-h-24`} defaultValue={block.subtitle ?? ""} maxLength={500} name="subtitle" />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Text CTA">
          <input className={inputClass} defaultValue={block.ctaLabel ?? ""} maxLength={80} name="ctaLabel" />
        </Field>
        <Field label="Destinație CTA internă">
          <input className={inputClass} defaultValue={block.ctaHref ?? ""} maxLength={300} name="ctaHref" pattern="/(?!/).*" placeholder="/shop" />
        </Field>
      </div>
      {state.message ? (
        <p aria-live="polite" className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-950 text-emerald-200" : "bg-red-950 text-red-200"}`} role="status">
          {state.message}
        </p>
      ) : null}
      <button className="w-fit rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Se salvează…" : "Salvează blocul"}
      </button>
    </form>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <label className="text-sm text-stone-200">{label}{children}</label>;
}

const inputClass = "mt-1 block w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100";
