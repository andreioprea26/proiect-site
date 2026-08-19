"use client";

import { useActionState } from "react";

import { ProfileActionState, updateProfile } from "./actions";

type ProfileFormProps = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
};

const inputClass = "mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const INITIAL_PROFILE_STATE: ProfileActionState = {
  fieldErrors: {},
  message: null,
  success: false,
};

export function ProfileForm(props: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfile, INITIAL_PROFILE_STATE);

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      <div>
        <label className="block text-sm font-medium" htmlFor="email">E-mail</label>
        <input className={`${inputClass} bg-stone-100`} id="email" readOnly type="email" value={props.email} />
        <p className="mt-2 text-xs text-stone-500">Adresa de e-mail nu poate fi schimbată aici.</p>
      </div>
      <ProfileInput error={state.fieldErrors.firstName} id="firstName" label="Prenume" defaultValue={props.firstName} />
      <ProfileInput error={state.fieldErrors.lastName} id="lastName" label="Nume" defaultValue={props.lastName} />
      <ProfileInput error={state.fieldErrors.phone} id="phone" label="Telefon" defaultValue={props.phone} type="tel" />
      {state.message ? (
        <p aria-live="polite" className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`} role="status">
          {state.message}
        </p>
      ) : null}
      <button className="rounded-lg bg-emerald-800 px-5 py-2.5 font-medium text-white disabled:opacity-60" disabled={isPending} type="submit">
        {isPending ? "Se salvează…" : "Salvează profilul"}
      </button>
    </form>
  );
}

function ProfileInput({ defaultValue, error, id, label, type = "text" }: { defaultValue: string; error?: string; id: string; label: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium" htmlFor={id}>{label}</label>
      <input aria-describedby={error ? `${id}-error` : undefined} aria-invalid={Boolean(error)} className={inputClass} defaultValue={defaultValue} id={id} name={id} type={type} />
      {error ? <p className="mt-2 text-sm text-red-700" id={`${id}-error`}>{error}</p> : null}
    </div>
  );
}
