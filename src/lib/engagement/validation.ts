export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

export function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export function looksAutomated(formData: FormData) {
  const honeypot = cleanText(formData.get("company"));
  const startedAt = Number(formData.get("startedAt"));
  return Boolean(honeypot) || !Number.isFinite(startedAt) || Date.now() - startedAt < 800;
}

export function validEmail(email: string) {
  return email.length >= 3 && email.length <= 254 && EMAIL_PATTERN.test(email);
}
