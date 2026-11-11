"use client";

import { useActionState } from "react";

import type { AddressFields } from "@/lib/account/validation";

import {
  AddressActionState,
  createAddress,
  updateAddress,
} from "./actions";

type AddressFormProps = {
  addressId?: string;
  initial?: AddressFields;
};

const EMPTY_ADDRESS: AddressFields = {
  label: "",
  recipientName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  county: "",
  postalCode: "",
  countryCode: "RO",
  isDefault: false,
};

const INITIAL_ADDRESS_STATE: AddressActionState = {
  fieldErrors: {},
  message: null,
  success: false,
};

const inputClass = "mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

export function AddressForm({ addressId, initial = EMPTY_ADDRESS }: AddressFormProps) {
  const action = addressId ? updateAddress : createAddress;
  const [state, formAction, isPending] = useActionState(action, INITIAL_ADDRESS_STATE);

  return (
    <form action={formAction} className="mt-5 grid gap-4 sm:grid-cols-2" noValidate>
      {addressId ? <input name="addressId" type="hidden" value={addressId} /> : null}
      <AddressInput defaultValue={initial.label} error={state.fieldErrors.label} id={addressId ? `${addressId}-label` : "new-label"} label="Etichetă" name="label" />
      <AddressInput defaultValue={initial.recipientName} error={state.fieldErrors.recipientName} id={addressId ? `${addressId}-recipient` : "new-recipient"} label="Destinatar" name="recipientName" required />
      <AddressInput defaultValue={initial.phone} error={state.fieldErrors.phone} id={addressId ? `${addressId}-phone` : "new-phone"} label="Telefon" name="phone" required type="tel" />
      <AddressInput defaultValue={initial.addressLine1} error={state.fieldErrors.addressLine1} id={addressId ? `${addressId}-line1` : "new-line1"} label="Adresă" name="addressLine1" required />
      <AddressInput defaultValue={initial.addressLine2} error={state.fieldErrors.addressLine2} id={addressId ? `${addressId}-line2` : "new-line2"} label="Detalii adresă" name="addressLine2" />
      <AddressInput defaultValue={initial.city} error={state.fieldErrors.city} id={addressId ? `${addressId}-city` : "new-city"} label="Localitate" name="city" required />
      <AddressInput defaultValue={initial.county} error={state.fieldErrors.county} id={addressId ? `${addressId}-county` : "new-county"} label="Județ" name="county" required />
      <AddressInput defaultValue={initial.postalCode} error={state.fieldErrors.postalCode} id={addressId ? `${addressId}-postal` : "new-postal"} label="Cod poștal" name="postalCode" />
      <AddressInput defaultValue={initial.countryCode} error={state.fieldErrors.countryCode} id={addressId ? `${addressId}-country` : "new-country"} label="Cod țară" maxLength={2} name="countryCode" required />
      <label className="flex items-center gap-2 self-end py-2 text-sm font-medium">
        <input defaultChecked={initial.isDefault} name="isDefault" type="checkbox" />
        Adresă implicită
      </label>
      {state.message ? <ActionMessage state={state} /> : null}
      <div className="sm:col-span-2">
        <button className="rounded-lg bg-emerald-800 px-5 py-2.5 font-medium text-white disabled:opacity-60" disabled={isPending} type="submit">
          {isPending ? "Se salvează…" : addressId ? "Salvează adresa" : "Adaugă adresa"}
        </button>
      </div>
    </form>
  );
}

function AddressInput({ defaultValue, error, id, label, maxLength, name, required, type = "text" }: { defaultValue: string; error?: string; id: string; label: string; maxLength?: number; name: string; required?: boolean; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium" htmlFor={id}>{label}</label>
      <input aria-describedby={error ? `${id}-error` : undefined} aria-invalid={Boolean(error)} className={inputClass} defaultValue={defaultValue} id={id} maxLength={maxLength} name={name} required={required} type={type} />
      {error ? <p className="mt-2 text-sm text-red-700" id={`${id}-error`}>{error}</p> : null}
    </div>
  );
}

function ActionMessage({ state }: { state: AddressActionState }) {
  return (
    <p aria-live="polite" className={`rounded-lg p-3 text-sm sm:col-span-2 ${state.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`} role="status">
      {state.message}
    </p>
  );
}
