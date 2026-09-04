"use server";

import { revalidatePath } from "next/cache";

import { requireAdminContext } from "@/lib/admin/server";
import { HOMEPAGE_SLOTS, type HomepageSlot } from "@/lib/homepage/server";

export type HomepageActionState = {
  success: boolean;
  message: string;
};

export async function saveHomepageBlock(
  _state: HomepageActionState,
  formData: FormData,
): Promise<HomepageActionState> {
  const slotValue = String(formData.get("slot") ?? "");
  const slot = HOMEPAGE_SLOTS.includes(slotValue as HomepageSlot)
    ? (slotValue as HomepageSlot)
    : null;
  const eyebrow = optionalText(formData, "eyebrow");
  const title = String(formData.get("title") ?? "").trim();
  const subtitle = optionalText(formData, "subtitle");
  const ctaLabel = optionalText(formData, "ctaLabel");
  const ctaHref = optionalText(formData, "ctaHref");
  const isActive = formData.get("isActive") === "on";
  const displayOrder = Number(formData.get("displayOrder"));

  if (
    !slot || title.length < 2 || title.length > 120
    || (eyebrow?.length ?? 0) > 80 || (subtitle?.length ?? 0) > 500
    || (ctaLabel?.length ?? 0) > 80
    || Boolean(ctaLabel) !== Boolean(ctaHref)
    || (ctaHref !== null && !isSafeInternalHref(ctaHref))
    || !Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 100
  ) {
    return { success: false, message: "Verifică titlul, CTA-ul și ordinea blocului." };
  }

  const { supabase } = await requireAdminContext();
  const { data, error } = await supabase.rpc("upsert_homepage_block", {
    p_slot: slot,
    p_eyebrow: eyebrow,
    p_title: title,
    p_subtitle: subtitle,
    p_cta_label: ctaLabel,
    p_cta_href: ctaHref,
    p_is_active: isActive,
    p_display_order: displayOrder,
  });
  const result = data as { success?: boolean; code?: string } | null;
  if (error || !result?.success) {
    return { success: false, message: "Blocul nu a putut fi salvat." };
  }

  revalidatePath("/");
  revalidatePath("/admin/homepage");
  return { success: true, message: "Blocul a fost salvat și este reflectat în storefront." };
}

function optionalText(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value.length > 0 ? value : null;
}

function isSafeInternalHref(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && value.length <= 300
    && /^\/[A-Za-z0-9/_?&=#.%-]*$/.test(value);
}
