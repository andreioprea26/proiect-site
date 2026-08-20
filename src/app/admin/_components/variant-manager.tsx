"use client";

import { useActionState, useState } from "react";

import { createVariant, deleteVariant, updateVariant } from "@/app/admin/product-detail-actions";
import type { ProductVariantRecord } from "@/lib/admin/product-details";
import { EMPTY_DETAIL_STATE } from "@/lib/admin/product-details-validation";

import { ActionMessage } from "./action-message";

const inputClass = "mt-2 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-950";

export function VariantManager({ productId, variants, hasDirectInventory }: { productId: string; variants: ProductVariantRecord[]; hasDirectInventory: boolean }) {
  return (
    <section className="rounded-2xl border border-stone-800 bg-stone-900 p-6" id="variante">
      <h2 className="text-2xl font-semibold">Variante</h2>
      <p className="mt-2 text-sm text-stone-300">Configurații fixe, precum mărime și culoare. Ordinea mai mică este afișată prima.</p>
      <div className="mt-6 grid gap-5">
        {variants.map((variant) => <VariantEditor key={variant.id} productId={productId} variant={variant} />)}
        {variants.length === 0 ? <p className="text-sm text-stone-400">Produsul nu are variante.</p> : null}
      </div>
      <div className="mt-8 border-t border-stone-800 pt-6">
        <h3 className="text-lg font-semibold">Variantă nouă</h3>
        {hasDirectInventory ? (
          <p className="mt-3 rounded-lg bg-amber-950 p-3 text-sm text-amber-200">Produsul are inventar direct. Schema nu permite adăugarea variantelor cât timp acel inventar există.</p>
        ) : (
          <VariantForm action={createVariant.bind(null, productId)} prefix="new-variant" submitLabel="Adaugă varianta" />
        )}
      </div>
    </section>
  );
}

function VariantEditor({ productId, variant }: { productId: string; variant: ProductVariantRecord }) {
  const [deleteState, deleteAction, deleting] = useActionState(deleteVariant.bind(null, productId, variant.id), EMPTY_DETAIL_STATE);
  return (
    <article className="rounded-xl border border-stone-700 p-5">
      <VariantForm action={updateVariant.bind(null, productId, variant.id)} initial={variant} prefix={`variant-${variant.id}`} submitLabel="Salvează varianta" />
      <form
        action={deleteAction}
        className="mt-4"
        onSubmit={(event) => {
          if (!window.confirm("Ștergi varianta? Variantele cu inventar sau istoric nu pot fi șterse.")) event.preventDefault();
        }}
      >
        <button className="text-sm font-medium text-red-300 disabled:opacity-60" disabled={deleting} type="submit">{deleting ? "Se șterge…" : "Șterge varianta"}</button>
      </form>
      <div className="mt-3"><ActionMessage state={deleteState} /></div>
    </article>
  );
}

function VariantForm({ action, initial, prefix, submitLabel }: { action: (state: typeof EMPTY_DETAIL_STATE, formData: FormData) => Promise<typeof EMPTY_DETAIL_STATE>; initial?: ProductVariantRecord; prefix: string; submitLabel: string }) {
  const [state, formAction, pending] = useActionState(action, EMPTY_DETAIL_STATE);
  const initialAttributes = Object.entries(initial?.attributes ?? { "": "" }).map(([key, value]) => ({ key, value }));
  const [attributes, setAttributes] = useState(initialAttributes);

  return (
    <form action={formAction} className="mt-4 grid gap-4" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <Field error={state.fieldErrors.title} id={`${prefix}-title`} label="Titlu">
          <input className={inputClass} defaultValue={initial?.title} id={`${prefix}-title`} maxLength={180} name="title" required />
        </Field>
        <Field error={state.fieldErrors.sku} id={`${prefix}-sku`} label="SKU opțional">
          <input className={inputClass} defaultValue={initial?.sku ?? ""} id={`${prefix}-sku`} maxLength={100} name="sku" />
        </Field>
        <Field error={state.fieldErrors.priceOverride} id={`${prefix}-price`} label="Preț propriu opțional (RON)">
          <input className={inputClass} defaultValue={initial?.price_override ?? ""} id={`${prefix}-price`} min="0" name="priceOverride" step="0.01" type="number" />
        </Field>
        <Field error={state.fieldErrors.displayOrder} id={`${prefix}-order`} label="Ordine">
          <input className={inputClass} defaultValue={initial?.display_order ?? 0} id={`${prefix}-order`} min="0" name="displayOrder" required type="number" />
        </Field>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Atribute</legend>
        <div className="mt-2 grid gap-2">
          {attributes.map((attribute, index) => (
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2" key={`${prefix}-attribute-${index}`}>
              <input aria-label={`Cheie atribut ${index + 1}`} className={inputClass} maxLength={50} name="attributeKey" placeholder="mărime" value={attribute.key} onChange={(event) => setAttributes((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, key: event.target.value } : item))} />
              <input aria-label={`Valoare atribut ${index + 1}`} className={inputClass} maxLength={100} name="attributeValue" placeholder="M" value={attribute.value} onChange={(event) => setAttributes((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} />
              <button aria-label={`Elimină atributul ${index + 1}`} className="mt-2 rounded-lg border border-stone-700 px-3" disabled={attributes.length === 1} onClick={() => setAttributes((items) => items.filter((_, itemIndex) => itemIndex !== index))} type="button">×</button>
            </div>
          ))}
        </div>
        {state.fieldErrors.attributes ? <p className="mt-2 text-sm text-red-300">{state.fieldErrors.attributes}</p> : null}
        <button className="mt-3 text-sm font-medium text-emerald-400" disabled={attributes.length >= 20} onClick={() => setAttributes((items) => [...items, { key: "", value: "" }])} type="button">+ Adaugă atribut</button>
      </fieldset>
      <label className="flex items-center gap-2 text-sm font-medium"><input defaultChecked={initial?.is_active ?? true} name="isActive" type="checkbox" /> Variantă activă</label>
      <ActionMessage state={state} />
      <div><button className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold disabled:opacity-60" disabled={pending} type="submit">{pending ? "Se salvează…" : submitLabel}</button></div>
    </form>
  );
}

function Field({ children, error, id, label }: { children: React.ReactNode; error?: string; id: string; label: string }) {
  return <div><label className="block text-sm font-medium" htmlFor={id}>{label}</label>{children}{error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}</div>;
}
