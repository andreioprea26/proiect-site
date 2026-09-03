"use client";

import { useActionState, useState } from "react";
import { submitCustomRequest, type CustomRequestActionState } from "./actions";

const INITIAL: CustomRequestActionState = { message: null, success: false };

export function CustomRequestForm({ defaultEmail = "", defaultName = "" }: { defaultEmail?: string; defaultName?: string }) {
  const [startedAt] = useState(() => Date.now());
  const [state, action, pending] = useActionState(submitCustomRequest, INITIAL);
  return <form action={action} className="mt-8 grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm" noValidate>
    <input name="startedAt" type="hidden" value={startedAt} />
    <div aria-hidden="true" className="absolute -left-[10000px]"><label htmlFor="custom-company">Companie</label><input autoComplete="off" id="custom-company" name="company" tabIndex={-1} /></div>
    <Field defaultValue={defaultName} label="Nume" name="name" />
    <Field defaultValue={defaultEmail} label="E-mail" name="email" type="email" />
    <label className="text-sm font-semibold">Descrierea cererii<textarea className="mt-2 min-h-44 w-full rounded-lg border border-stone-300 px-3 py-2" maxLength={5000} minLength={30} name="description" placeholder="Descrie produsul, dimensiunile, culorile și ocazia." required /></label>
    <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">Buget orientativ (RON, opțional)<input className="mt-2 block w-full rounded-lg border border-stone-300 px-3 py-2" min="0" name="budget" step="0.01" type="number" /></label><label className="text-sm font-semibold">Data dorită (opțional)<input className="mt-2 block w-full rounded-lg border border-stone-300 px-3 py-2" name="desiredDate" type="date" /></label></div>
    {state.message ? <p aria-live="polite" className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{state.message}</p> : null}
    <button className="w-fit rounded-full bg-emerald-900 px-6 py-3 font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Se trimite…" : "Trimite cererea"}</button>
  </form>;
}

function Field({ defaultValue, label, name, type = "text" }: { defaultValue: string; label: string; name: string; type?: string }) { return <label className="text-sm font-semibold">{label}<input className="mt-2 block w-full rounded-lg border border-stone-300 px-3 py-2" defaultValue={defaultValue} maxLength={254} name={name} required type={type} /></label>; }
