"use client";

import { useActionState, useState } from "react";
import { submitContact, type ContactActionState } from "./actions";

const INITIAL: ContactActionState = { message: null, success: false };

export function ContactForm({ defaultEmail = "", defaultName = "" }: { defaultEmail?: string; defaultName?: string }) {
  const [startedAt] = useState(() => Date.now());
  const [state, action, pending] = useActionState(submitContact, INITIAL);
  return <form action={action} className="mt-8 grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm" noValidate>
    <input name="startedAt" type="hidden" value={startedAt} />
    <div aria-hidden="true" className="absolute -left-[10000px]"><label htmlFor="contact-company">Companie</label><input autoComplete="off" id="contact-company" name="company" tabIndex={-1} /></div>
    <Field defaultValue={defaultName} label="Nume" name="name" />
    <Field defaultValue={defaultEmail} label="E-mail" name="email" type="email" />
    <label className="text-sm font-semibold">Categorie<select className="mt-2 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2" defaultValue="general" name="category"><option value="general">Întrebare generală</option><option value="order">Comandă existentă</option><option value="product">Produs</option><option value="complaint">Reclamație</option><option value="other">Alt subiect</option></select></label>
    <label className="text-sm font-semibold">Mesaj<textarea className="mt-2 min-h-40 w-full rounded-lg border border-stone-300 px-3 py-2" maxLength={4000} minLength={20} name="message" required /></label>
    {state.message ? <p aria-live="polite" className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{state.message}</p> : null}
    <button className="w-fit rounded-full bg-emerald-900 px-6 py-3 font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Se trimite…" : "Trimite mesajul"}</button>
  </form>;
}

function Field({ defaultValue, label, name, type = "text" }: { defaultValue: string; label: string; name: string; type?: string }) { return <label className="text-sm font-semibold">{label}<input className="mt-2 block w-full rounded-lg border border-stone-300 px-3 py-2" defaultValue={defaultValue} maxLength={254} name={name} required type={type} /></label>; }
