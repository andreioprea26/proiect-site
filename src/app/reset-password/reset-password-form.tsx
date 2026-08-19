"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  INITIAL_PASSWORD_RESET_STATE,
} from "@/lib/auth/password-reset";
import { MINIMUM_PASSWORD_LENGTH } from "@/lib/auth/registration";

import { updatePassword } from "./actions";

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    updatePassword,
    INITIAL_PASSWORD_RESET_STATE,
  );

  if (state.kind === "success") {
    return (
      <div className="mt-6">
        <p
          aria-live="polite"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
          role="status"
        >
          {state.message}
        </p>
        <Link
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
          href="/login"
        >
          Mergi la autentificare
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      <div>
        <label className="block text-sm font-medium" htmlFor="password">
          Parola nouă
        </label>
        <input
          aria-describedby={
            state.fieldErrors.password
              ? "password-help password-error"
              : "password-help"
          }
          aria-invalid={Boolean(state.fieldErrors.password)}
          autoComplete="new-password"
          className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          id="password"
          minLength={MINIMUM_PASSWORD_LENGTH}
          name="password"
          type="password"
        />
        <p className="mt-2 text-sm text-stone-600" id="password-help">
          Folosește cel puțin {MINIMUM_PASSWORD_LENGTH} caractere.
        </p>
        {state.fieldErrors.password ? (
          <p className="mt-2 text-sm text-red-700" id="password-error">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="confirm-password">
          Confirmă parola nouă
        </label>
        <input
          aria-describedby={
            state.fieldErrors.confirmPassword
              ? "confirm-password-error"
              : undefined
          }
          aria-invalid={Boolean(state.fieldErrors.confirmPassword)}
          autoComplete="new-password"
          className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          id="confirm-password"
          name="confirmPassword"
          type="password"
        />
        {state.fieldErrors.confirmPassword ? (
          <p className="mt-2 text-sm text-red-700" id="confirm-password-error">
            {state.fieldErrors.confirmPassword}
          </p>
        ) : null}
      </div>

      {state.message ? (
        <p
          aria-live="polite"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <button
        className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Se salvează…" : "Salvează parola nouă"}
      </button>
    </form>
  );
}
