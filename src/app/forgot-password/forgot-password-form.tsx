"use client";

import { FormEvent, useState } from "react";

import {
  isValidEmail,
  PASSWORD_RESET_REQUEST_MESSAGE,
} from "@/lib/auth/password-reset";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [emailError, setEmailError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();

    setEmailError(null);
    setMessage(null);

    if (!isValidEmail(email)) {
      setEmailError("Introdu o adresă de e-mail validă.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
    } catch {
      // The result stays generic so account existence and provider details are
      // never disclosed to the visitor.
    } finally {
      form.reset();
      setMessage(PASSWORD_RESET_REQUEST_MESSAGE);
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
          aria-describedby={emailError ? "email-error" : undefined}
          aria-invalid={Boolean(emailError)}
          autoComplete="email"
          className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          id="email"
          name="email"
          type="email"
        />
        {emailError ? (
          <p className="mt-2 text-sm text-red-700" id="email-error">
            {emailError}
          </p>
        ) : null}
      </div>

      {message ? (
        <p
          aria-live="polite"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <button
        className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Se trimite…" : "Trimite instrucțiunile"}
      </button>
    </form>
  );
}
