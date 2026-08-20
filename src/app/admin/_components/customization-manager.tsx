"use client";

import { useActionState, useState } from "react";

import { createCustomization, deleteCustomization, updateCustomization } from "@/app/admin/product-detail-actions";
import { CUSTOMIZATION_TYPE_LABELS, CUSTOMIZATION_TYPES, type CustomizationOptionRecord, type CustomizationType } from "@/lib/admin/product-details";
import { EMPTY_DETAIL_STATE } from "@/lib/admin/product-details-validation";

import { ActionMessage } from "./action-message";

const inputClass = "mt-2 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-950";

export function CustomizationManager({ productId, options }: { productId: string; options: CustomizationOptionRecord[] }) {
  return (
    <section className="rounded-2xl border border-stone-800 bg-stone-900 p-6" id="personalizari">
      <h2 className="text-2xl font-semibold">Personalizări</h2>
      <p className="mt-2 text-sm text-stone-300">Opțiuni completate ulterior de client. Configurația afișată depinde de tip.</p>
      <div className="mt-6 grid gap-5">
        {options.map((option) => <CustomizationEditor key={option.id} option={option} productId={productId} />)}
        {options.length === 0 ? <p className="text-sm text-stone-400">Produsul nu are opțiuni de personalizare.</p> : null}
      </div>
      <div className="mt-8 border-t border-stone-800 pt-6">
        <h3 className="text-lg font-semibold">Opțiune nouă</h3>
        <CustomizationForm action={createCustomization.bind(null, productId)} prefix="new-customization" submitLabel="Adaugă opțiunea" />
      </div>
    </section>
  );
}

function CustomizationEditor({ option, productId }: { option: CustomizationOptionRecord; productId: string }) {
  const [deleteState, deleteAction, deleting] = useActionState(deleteCustomization.bind(null, productId, option.id), EMPTY_DETAIL_STATE);
  return (
    <article className="rounded-xl border border-stone-700 p-5">
      <CustomizationForm action={updateCustomization.bind(null, productId, option.id)} initial={option} prefix={`customization-${option.id}`} submitLabel="Salvează opțiunea" />
      <form action={deleteAction} className="mt-4" onSubmit={(event) => { if (!window.confirm("Ștergi această opțiune de personalizare?")) event.preventDefault(); }}>
        <button className="text-sm font-medium text-red-300 disabled:opacity-60" disabled={deleting} type="submit">{deleting ? "Se șterge…" : "Șterge opțiunea"}</button>
      </form>
      <div className="mt-3"><ActionMessage state={deleteState} /></div>
    </article>
  );
}

function CustomizationForm({ action, initial, prefix, submitLabel }: { action: (state: typeof EMPTY_DETAIL_STATE, formData: FormData) => Promise<typeof EMPTY_DETAIL_STATE>; initial?: CustomizationOptionRecord; prefix: string; submitLabel: string }) {
  const [state, formAction, pending] = useActionState(action, EMPTY_DETAIL_STATE);
  const [optionType, setOptionType] = useState<CustomizationType>(initial?.option_type ?? "selection");
  const config = initial?.configuration ?? {};
  const selectionValues = Array.isArray(config.values) ? config.values.filter((item): item is string => typeof item === "string").join("\n") : "";
  const minLength = typeof config.min_length === "number" ? config.min_length : 0;
  const maxLength = typeof config.max_length === "number" ? config.max_length : "";
  const multiline = config.multiline === true;
  const imageInstructions = typeof config.instructions === "string" ? config.instructions : "";

  return (
    <form action={formAction} className="mt-4 grid gap-4" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <Field error={state.fieldErrors.name} id={`${prefix}-name`} label="Nume"><input className={inputClass} defaultValue={initial?.name} id={`${prefix}-name`} maxLength={180} name="name" required /></Field>
        <Field error={state.fieldErrors.optionType} id={`${prefix}-type`} label="Tip">
          <select className={inputClass} id={`${prefix}-type`} name="optionType" value={optionType} onChange={(event) => setOptionType(event.target.value as CustomizationType)}>{CUSTOMIZATION_TYPES.map((type) => <option key={type} value={type}>{CUSTOMIZATION_TYPE_LABELS[type]}</option>)}</select>
        </Field>
        <Field error={state.fieldErrors.additionalCost} id={`${prefix}-cost`} label="Cost suplimentar (RON)"><input className={inputClass} defaultValue={initial?.additional_cost ?? 0} id={`${prefix}-cost`} min="0" name="additionalCost" required step="0.01" type="number" /></Field>
        <Field error={state.fieldErrors.displayOrder} id={`${prefix}-order`} label="Ordine"><input className={inputClass} defaultValue={initial?.display_order ?? 0} id={`${prefix}-order`} min="0" name="displayOrder" required type="number" /></Field>
      </div>
      <Field error={state.fieldErrors.description} id={`${prefix}-description`} label="Descriere"><textarea className={inputClass} defaultValue={initial?.description ?? ""} id={`${prefix}-description`} maxLength={5000} name="description" rows={3} /></Field>
      <ConfigurationFields error={state.fieldErrors.configuration} imageInstructions={imageInstructions} maxLength={maxLength} minLength={minLength} multiline={multiline} optionType={optionType} prefix={prefix} selectionValues={selectionValues} />
      <div className="flex flex-wrap gap-5 text-sm font-medium">
        <label className="flex items-center gap-2"><input defaultChecked={initial?.is_required ?? false} name="isRequired" type="checkbox" /> Obligatorie</label>
        <label className="flex items-center gap-2"><input defaultChecked={initial?.is_active ?? true} name="isActive" type="checkbox" /> Activă</label>
      </div>
      <ActionMessage state={state} />
      <div><button className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold disabled:opacity-60" disabled={pending} type="submit">{pending ? "Se salvează…" : submitLabel}</button></div>
    </form>
  );
}

function ConfigurationFields({ error, imageInstructions, maxLength, minLength, multiline, optionType, prefix, selectionValues }: { error?: string; imageInstructions: string; maxLength: number | string; minLength: number; multiline: boolean; optionType: CustomizationType; prefix: string; selectionValues: string }) {
  return (
    <fieldset className="rounded-lg border border-stone-800 p-4">
      <legend className="px-2 text-sm font-medium">Configurație</legend>
      {optionType === "selection" ? <Field id={`${prefix}-values`} label="Valori permise, câte una pe linie"><textarea className={inputClass} defaultValue={selectionValues} id={`${prefix}-values`} name="selectionValues" rows={4} /></Field> : null}
      {optionType === "text" ? <div className="grid gap-4 md:grid-cols-2"><Field id={`${prefix}-min`} label="Lungime minimă"><input className={inputClass} defaultValue={minLength} id={`${prefix}-min`} min="0" name="minLength" type="number" /></Field><Field id={`${prefix}-max`} label="Lungime maximă opțională"><input className={inputClass} defaultValue={maxLength} id={`${prefix}-max`} min="0" name="maxLength" type="number" /></Field><label className="flex items-center gap-2 text-sm"><input defaultChecked={multiline} name="multiline" type="checkbox" /> Text pe mai multe linii</label></div> : null}
      {optionType === "boolean" ? <p className="text-sm text-stone-400">Tipul Da/Nu nu necesită configurare suplimentară.</p> : null}
      {optionType === "image" ? <Field id={`${prefix}-instructions`} label="Instrucțiuni pentru imagine"><textarea className={inputClass} defaultValue={imageInstructions} id={`${prefix}-instructions`} maxLength={1000} name="imageInstructions" rows={3} /></Field> : null}
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </fieldset>
  );
}

function Field({ children, error, id, label }: { children: React.ReactNode; error?: string; id: string; label: string }) {
  return <div><label className="block text-sm font-medium" htmlFor={id}>{label}</label>{children}{error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}</div>;
}
