import { STORE_CONFIG, type PublicStoreConfig } from "../config/store.ts";

export const SETTING_FIELDS = {
  display_name: { label: "Nume magazin", max: 120 },
  tagline: { label: "Tagline", max: 160 },
  short_description: { label: "Descriere scurtă", max: 500 },
  seo_description: { label: "Descriere SEO", max: 300 },
  footer_description: { label: "Descriere footer", max: 500 },
  public_email: { label: "Email public", max: 254 },
  public_phone: { label: "Telefon public", max: 16 },
  whatsapp: { label: "WhatsApp", max: 16 },
  instagram_url: { label: "Instagram (HTTPS)", max: 300 },
  facebook_url: { label: "Facebook (HTTPS)", max: 300 },
  tiktok_url: { label: "TikTok (HTTPS)", max: 300 },
} as const;
export type SettingField = keyof typeof SETTING_FIELDS;
export const SETTING_KEYS = Object.keys(SETTING_FIELDS) as SettingField[];
export type SettingsValues = Record<SettingField, string | null>;
export type SettingsErrors = Partial<Record<SettingField, string>>;

export function validSetting(field: SettingField, value: string) {
  if (!value || value.length > SETTING_FIELDS[field].max || /[<>]/.test(value)
    || [...value].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return false;
  if (field === "public_email") return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
  if (field === "public_phone" || field === "whatsapp") return /^\+?[0-9]{7,15}$/.test(value);
  const hosts = { instagram_url: "instagram", facebook_url: "facebook", tiktok_url: "tiktok" };
  if (field in hosts) {
    const host = hosts[field as keyof typeof hosts];
    return new RegExp(`^https://(www\\.)?${host}\\.com(/[A-Za-z0-9._~/@-]*)?$`).test(value);
  }
  return true;
}

/** All ingress is allowlisted; malformed fields fall back independently. */
export function normalizeSettings(input: unknown) {
  const row = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const values = {} as SettingsValues;
  const errors: SettingsErrors = {};
  for (const field of SETTING_KEYS) {
    const raw = row[field];
    const value = typeof raw === "string" ? raw.trim() : "";
    const valid = (raw == null || typeof raw === "string") && (!value || validSetting(field, value));
    values[field] = valid && value ? value : null;
    if (!valid) errors[field] = `Verifică ${SETTING_FIELDS[field].label.toLowerCase()}: text simplu, maximum ${SETTING_FIELDS[field].max} caractere și format valid.`;
  }
  return { values, errors };
}

export function resolveStoreSettings(input: unknown, fallback: PublicStoreConfig = STORE_CONFIG): PublicStoreConfig {
  const { values } = normalizeSettings(input);
  return {
    ...fallback,
    name: values.display_name ?? fallback.name,
    tagline: values.tagline ?? fallback.tagline,
    description: values.short_description ?? fallback.description,
    seoDescription: values.seo_description ?? fallback.seoDescription,
    footerDescription: values.footer_description ?? fallback.footerDescription,
    contact: { email: values.public_email ?? fallback.contact.email, phone: values.public_phone ?? fallback.contact.phone, whatsapp: values.whatsapp ?? fallback.contact.whatsapp },
    social: { instagram: values.instagram_url ?? fallback.social.instagram, facebook: values.facebook_url ?? fallback.social.facebook, tiktok: values.tiktok_url ?? fallback.social.tiktok },
  };
}

export async function loadPublicSettings(read: () => Promise<unknown>): Promise<PublicStoreConfig> {
  try { return resolveStoreSettings(await read()); }
  catch { return STORE_CONFIG; }
}
