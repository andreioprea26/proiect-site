import "server-only";

import { requireAdminContext } from "@/lib/admin/server";
import { createClient } from "@/lib/supabase/server";

export const HOMEPAGE_SLOTS = [
  "hero",
  "categories",
  "products",
  "collections",
  "promo",
] as const;

export type HomepageSlot = (typeof HOMEPAGE_SLOTS)[number];

export type HomepageBlock = {
  slot: HomepageSlot;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  isActive: boolean;
  displayOrder: number;
  isConfigured: boolean;
};

export const HOMEPAGE_DEFAULTS: Record<HomepageSlot, HomepageBlock> = {
  hero: {
    slot: "hero",
    eyebrow: "Lucrat manual în România",
    title: "Obiecte handmade pentru gesturi care rămân.",
    subtitle: "Descoperă produse realizate în serii mici, unicate și creații pregătite special la comandă.",
    ctaLabel: "Descoperă Magazinul",
    ctaHref: "/shop",
    isActive: true,
    displayOrder: 0,
    isConfigured: false,
  },
  categories: {
    slot: "categories",
    eyebrow: "Explorează",
    title: "Categorii",
    subtitle: null,
    ctaLabel: "Toate categoriile",
    ctaHref: "/categories",
    isActive: true,
    displayOrder: 10,
    isConfigured: false,
  },
  products: {
    slot: "products",
    eyebrow: "Din atelier",
    title: "Produse publicate recent",
    subtitle: null,
    ctaLabel: "Vezi Magazinul",
    ctaHref: "/shop",
    isActive: true,
    displayOrder: 20,
    isConfigured: false,
  },
  collections: {
    slot: "collections",
    eyebrow: "Selecții de sezon",
    title: "Colecții",
    subtitle: null,
    ctaLabel: "Toate colecțiile",
    ctaHref: "/collections",
    isActive: true,
    displayOrder: 30,
    isConfigured: false,
  },
  promo: {
    slot: "promo",
    eyebrow: "Din atelierul nostru",
    title: "Cauți ceva creat special pentru tine?",
    subtitle: "Spune-ne ce îți imaginezi, iar noi îți răspundem cu opțiunile potrivite.",
    ctaLabel: "Trimite o cerere",
    ctaHref: "/custom-orders",
    isActive: false,
    displayOrder: 40,
    isConfigured: false,
  },
};

export async function getPublicHomepageBlocks(): Promise<HomepageBlock[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_homepage_blocks");

  if (error?.code === "PGRST202" || error?.code === "42883") {
    return HOMEPAGE_SLOTS.map((slot) => HOMEPAGE_DEFAULTS[slot]);
  }
  if (error) throw new Error("Configurația homepage-ului nu a putut fi încărcată.");

  const configured = new Map<HomepageSlot, HomepageBlock>();
  for (const raw of (data ?? []) as Array<Record<string, unknown>>) {
    if (!isHomepageSlot(raw.slot)) continue;
    const fallback = HOMEPAGE_DEFAULTS[raw.slot];
    const isActive = raw.is_active === true;
    configured.set(raw.slot, {
      slot: raw.slot,
      eyebrow: isActive ? nullableString(raw.eyebrow) : null,
      title: isActive ? String(raw.title ?? fallback.title) : fallback.title,
      subtitle: isActive ? nullableString(raw.subtitle) : null,
      ctaLabel: isActive ? nullableString(raw.cta_label) : null,
      ctaHref: isActive ? nullableString(raw.cta_href) : null,
      isActive,
      displayOrder: Number(raw.display_order ?? fallback.displayOrder),
      isConfigured: true,
    });
  }

  return HOMEPAGE_SLOTS.map((slot) => configured.get(slot) ?? HOMEPAGE_DEFAULTS[slot])
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function getAdminHomepageBlocks(): Promise<HomepageBlock[]> {
  const { supabase } = await requireAdminContext();
  const { data, error } = await supabase
    .from("homepage_blocks")
    .select("slot, eyebrow, title, subtitle, cta_label, cta_href, is_active, display_order")
    .order("display_order");
  if (error) throw new Error("Configurația homepage-ului nu a putut fi încărcată.");

  const configured = new Map<HomepageSlot, HomepageBlock>();
  for (const raw of data ?? []) {
    if (!isHomepageSlot(raw.slot)) continue;
    configured.set(raw.slot, {
      slot: raw.slot,
      eyebrow: raw.eyebrow,
      title: raw.title,
      subtitle: raw.subtitle,
      ctaLabel: raw.cta_label,
      ctaHref: raw.cta_href,
      isActive: raw.is_active,
      displayOrder: raw.display_order,
      isConfigured: true,
    });
  }
  return HOMEPAGE_SLOTS.map((slot) => configured.get(slot) ?? HOMEPAGE_DEFAULTS[slot])
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

function isHomepageSlot(value: unknown): value is HomepageSlot {
  return typeof value === "string" && HOMEPAGE_SLOTS.includes(value as HomepageSlot);
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
