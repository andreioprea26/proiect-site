"use client";

import { FormEvent, useState } from "react";

import {
  getRegistrationErrorMessage,
  MINIMUM_PASSWORD_LENGTH,
  RegistrationFieldErrors,
  validateRegistrationFields,
} from "@/lib/auth/registration";
import { createClient } from "@/lib/supabase/client";

type RegistrationResult =
  | { kind: "error"; message: string }
  | { kind: "success"; message: string }
  | null;

export function RegisterForm() {
  const [fieldErrors, setFieldErrors] =
    useState<RegistrationFieldErrors>({});
  const [result, setResult] = useState<RegistrationResult>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const fields = {
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    };
    const errors = validateRegistrationFields(fields);

    setFieldErrors(errors);
    setResult(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: fields.email,
        password: fields.password,
      });

      if (error) {
        setResult({
          kind: "error",
          message: getRegistrationErrorMessage(error.code),
        });
        return;
      }

      if (!data.user) {
        setResult({
          kind: "error",
          message: getRegistrationErrorMessage(undefined),
        });
        return;
      }

      form.reset();
      setResult({
        kind: "success",
        message: data.session
          ? "Contul a fost creat și sesiunea a fost inițiată."
          : "Contul a fost creat. Verifică mesajul primit pe e-mail pentru a confirma adresa înainte de autentificare.",
      });
    } catch {
      setResult({
        kind: "error",
        message: getRegistrationErrorMessage(undefined),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium" htmlFor="email">
          E-mail
        </label>
        <input
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          aria-invalid={Boolean(fieldErrors.email)}
          autoComplete="email"
          className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          id="email"
          name="email"
          type="email"
        />
        {fieldErrors.email ? (
          <p className="mt-2 text-sm text-red-700" id="email-error">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="password">
          Parolă
        </label>
        <input
          aria-describedby={
            fieldErrors.password ? "password-help password-error" : "password-help"
          }
          aria-invalid={Boolean(fieldErrors.password)}
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
        {fieldErrors.password ? (
          <p className="mt-2 text-sm text-red-700" id="password-error">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="confirm-password">
          Confirmă parola
        </label>
        <input
          aria-describedby={
            fieldErrors.confirmPassword ? "confirm-password-error" : undefined
          }
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
          autoComplete="new-password"
          className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          id="confirm-password"
          name="confirmPassword"
          type="password"
        />
        {fieldErrors.confirmPassword ? (
          <p className="mt-2 text-sm text-red-700" id="confirm-password-error">
            {fieldErrors.confirmPassword}
          </p>
        ) : null}
      </div>

      {result ? (
        <p
          aria-live="polite"
          className={
            result.kind === "success"
              ? "rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
              : "rounded-lg bg-red-50 p-3 text-sm text-red-800"
          }
          role={result.kind === "error" ? "alert" : "status"}
        >
          {result.message}
        </p>
      ) : null}

      <button
        className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Se creează contul…" : "Creează cont"}
      </button>
    </form>
  );
}
