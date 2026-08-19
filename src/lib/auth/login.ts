export type LoginFields = {
  email: string;
  password: string;
};

export type LoginFieldErrors = Partial<Record<keyof LoginFields, string>>;

export type LoginActionState = {
  fieldErrors: LoginFieldErrors;
  message: string | null;
};

export const INITIAL_LOGIN_STATE: LoginActionState = {
  fieldErrors: {},
  message: null,
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginFields(fields: LoginFields): LoginFieldErrors {
  const errors: LoginFieldErrors = {};

  if (!emailPattern.test(fields.email.trim())) {
    errors.email = "Introdu o adresă de e-mail validă.";
  }

  if (!fields.password) {
    errors.password = "Introdu parola.";
  }

  return errors;
}

export function getLoginErrorMessage(code: string | undefined): string {
  switch (code) {
    case "email_not_confirmed":
      return "Confirmă adresa de e-mail înainte de autentificare.";
    case "invalid_credentials":
      return "E-mailul sau parola sunt incorecte.";
    case "over_request_rate_limit":
      return "Au fost trimise prea multe solicitări. Încearcă din nou mai târziu.";
    default:
      return "Autentificarea nu a putut fi finalizată. Încearcă din nou.";
  }
}
