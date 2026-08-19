"use client";

import { useActionState } from "react";

import { INITIAL_LOGIN_STATE } from "@/lib/auth/login";

import { login } from "./actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    login,
    INITIAL_LOGIN_STATE,
  );

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      <div>
        <label className="block text-sm font-medium" htmlFor="email">
          E-mail
        </label>
        <input
          aria-describedby={state.fieldErrors.email ? "email-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors.email)}
          autoComplete="email"
          className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          id="email"
          name="email"
          type="email"
        />
        {state.fieldErrors.email ? (
          <p className="mt-2 text-sm text-red-700" id="email-error">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="password">
          Parolă
        </label>
        <input
          aria-describedby={
            state.fieldErrors.password ? "password-error" : undefined
          }
          aria-invalid={Boolean(state.fieldErrors.password)}
          autoComplete="current-password"
          className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          id="password"
          name="password"
          type="password"
        />
        {state.fieldErrors.password ? (
          <p className="mt-2 text-sm text-red-700" id="password-error">
            {state.fieldErrors.password}
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
        {isPending ? "Se autentifică…" : "Autentificare"}
      </button>
    </form>
  );
}
