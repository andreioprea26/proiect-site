export const MINIMUM_PASSWORD_LENGTH = 8;

export type RegistrationFields = {
  email: string;
  password: string;
  confirmPassword: string;
};

export type RegistrationFieldErrors = Partial<
  Record<keyof RegistrationFields, string>
>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistrationFields(
  fields: RegistrationFields,
): RegistrationFieldErrors {
  const errors: RegistrationFieldErrors = {};

  if (!emailPattern.test(fields.email.trim())) {
    errors.email = "Introdu o adresă de e-mail validă.";
  }

  if (fields.password.length < MINIMUM_PASSWORD_LENGTH) {
    errors.password = `Parola trebuie să aibă cel puțin ${MINIMUM_PASSWORD_LENGTH} caractere.`;
  }

  if (fields.password !== fields.confirmPassword) {
    errors.confirmPassword = "Parolele introduse nu coincid.";
  }

  return errors;
}

export function getRegistrationErrorMessage(code: string | undefined): string {
  switch (code) {
    case "email_address_invalid":
      return "Adresa de e-mail nu este validă.";
    case "weak_password":
      return "Parola nu respectă cerințele de securitate. Alege o parolă mai puternică.";
    case "user_already_exists":
      return "Există deja un cont asociat acestei adrese de e-mail.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Au fost trimise prea multe solicitări. Încearcă din nou mai târziu.";
    case "signup_disabled":
      return "Înregistrarea este momentan indisponibilă.";
    default:
      return "Înregistrarea nu a putut fi finalizată. Încearcă din nou.";
  }
}
