"use client";

import { useActionState } from "react";
import { SETTING_FIELDS, SETTING_KEYS, type SettingsValues } from "@/lib/store-settings/model";
import { saveStoreSettings } from "./actions";

export function SettingsForm({ values }: { values: SettingsValues }) {
  const [state, action, pending] = useActionState(saveStoreSettings, { success: false, message: "", errors: {} });
  return <form action={action} className="mt-8 grid max-w-2xl gap-5">
    {SETTING_KEYS.map((field) => <div key={field}>
      <label className="mb-2 block text-sm font-medium" htmlFor={field}>{SETTING_FIELDS[field].label}</label>
      <input className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2" id={field} name={field} defaultValue={values[field] ?? ""} maxLength={SETTING_FIELDS[field].max} aria-invalid={Boolean(state.errors[field])} aria-describedby={state.errors[field] ? `${field}-error` : undefined} disabled={pending} />
      {state.errors[field] ? <p className="mt-1 text-sm text-red-300" id={`${field}-error`}>{state.errors[field]}</p> : null}
    </div>)}
    <p className="text-sm text-stone-400">Câmp gol = fallback versionat (sau link/date de contact ascunse dacă fallback-ul este gol). Telefon/WhatsApp: cifre, opțional + la început. Numai text simplu; fără HTML sau secrete. Emailul public nu schimbă expeditorul mesajelor.</p>
    {state.message ? <p role={state.success ? "status" : "alert"}>{state.message}</p> : null}
    <button className="min-h-11 rounded-lg bg-brand px-5 py-3 font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Se salvează…" : "Salvează setările"}</button>
  </form>;
}
