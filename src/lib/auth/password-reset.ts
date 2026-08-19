import type { JwtPayload } from "@supabase/supabase-js";

import { MINIMUM_PASSWORD_LENGTH } from "@/lib/auth/registration";

export const PASSWORD_RESET_REQUEST_MESSAGE =
  "Dacă există un cont pentru această adresă, vei primi instrucțiunile prin e-mail.";

export type PasswordResetFields = {
  password: string;
  confirmPassword: string;
};

export type PasswordResetFieldErrors = Partial<
  Record<keyof PasswordResetFields, string>
>;

export type PasswordResetActionState = {
  fieldErrors: PasswordResetFieldErrors;
  kind: "error" | "idle" | "success";
  message: string | null;
};

export const INITIAL_PASSWORD_RESET_STATE: PasswordResetActionState = {
  fieldErrors: {},
  kind: "idle",
  message: null,
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return emailPattern.test(email.trim());
}

export function validatePasswordResetFields(
  fields: PasswordResetFields,
): PasswordResetFieldErrors {
  const errors: PasswordResetFieldErrors = {};

  if (fields.password.length < MINIMUM_PASSWORD_LENGTH) {
    errors.password = `Parola trebuie să aibă cel puțin ${MINIMUM_PASSWORD_LENGTH} caractere.`;
  }

  if (fields.password !== fields.confirmPassword) {
    errors.confirmPassword = "Parolele introduse nu coincid.";
  }

  return errors;
}

export function isRecoveryClaim(claims: JwtPayload): boolean {
  return (
    Array.isArray(claims.amr) &&
    claims.amr.some(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        "method" in entry &&
        entry.method === "recovery",
    )
  );
}
