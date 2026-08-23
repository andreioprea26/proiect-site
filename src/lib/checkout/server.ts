import "server-only";

import { createClient } from "@/lib/supabase/server";

import type {
  CheckoutPrefill,
  CheckoutQuote,
  CheckoutQuoteError,
  CheckoutQuoteLine,
  ShippingMethod,
} from "./types";

export async function getCheckoutPageData(): Promise<{
  prefill: CheckoutPrefill;
  shippingMethods: ShippingMethod[];
}> {
  const supabase = await createClient();
  const [{ data: userData }, shippingResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("shipping_methods")
      .select("id, code, name, description, price_minor")
      .eq("is_active", true)
      .order("display_order")
      .order("name"),
  ]);
  const shippingMethods: ShippingMethod[] = (shippingResult.data ?? []).map(
    (method) => ({
      id: method.id,
      code: method.code,
      name: method.name,
      description: method.description,
      priceMinor: Number(method.price_minor),
    }),
  );
  const user = userData.user;
  if (!user) {
    return {
      shippingMethods,
      prefill: {
        authenticated: false,
        email: "",
        phone: "",
        customerName: "",
        addresses: [],
      },
    };
  }

  const [profileResult, addressResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, phone")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("customer_addresses")
      .select("id, label, recipient_name, phone, address_line_1, address_line_2, city, county, postal_code, country_code")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at"),
  ]);
  const profile = profileResult.data;
  const addresses = (addressResult.data ?? []).map((address) => ({
    id: address.id,
    label: address.label || address.recipient_name,
    recipientName: address.recipient_name,
    phone: address.phone,
    addressLine1: address.address_line_1,
    addressLine2: address.address_line_2 ?? "",
    city: address.city,
    county: address.county,
    postalCode: address.postal_code ?? "",
    countryCode: address.country_code,
  }));
  const customerName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ");

  return {
    shippingMethods,
    prefill: {
      authenticated: true,
      email: user.email ?? "",
      phone: profile?.phone ?? addresses[0]?.phone ?? "",
      customerName: customerName || addresses[0]?.recipientName || "",
      addresses,
    },
  };
}

export async function requestAuthoritativeQuote(
  lines: unknown,
  shippingMethodId: string,
): Promise<CheckoutQuote | null> {
  const supabase = await createClient();
  const [quoteResult, shippingResult] = await Promise.all([
    supabase.rpc("quote_checkout", { p_lines: lines }),
    supabase
      .from("shipping_methods")
      .select("id, code, name, description, price_minor")
      .eq("id", shippingMethodId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);
  if (quoteResult.error || shippingResult.error || !shippingResult.data) {
    return null;
  }

  const raw = quoteResult.data as {
    valid?: unknown;
    lines?: unknown;
    errors?: unknown;
    subtotalMinor?: unknown;
    currency?: unknown;
  };
  if (
    typeof raw?.valid !== "boolean" ||
    !Array.isArray(raw.lines) ||
    !Array.isArray(raw.errors) ||
    !Number.isSafeInteger(raw.subtotalMinor) ||
    raw.currency !== "RON"
  ) {
    return null;
  }
  const method: ShippingMethod = {
    id: shippingResult.data.id,
    code: shippingResult.data.code,
    name: shippingResult.data.name,
    description: shippingResult.data.description,
    priceMinor: Number(shippingResult.data.price_minor),
  };
  const subtotalMinor = raw.subtotalMinor as number;

  return {
    valid: raw.valid,
    lines: raw.lines as CheckoutQuoteLine[],
    errors: raw.errors as CheckoutQuoteError[],
    subtotalMinor,
    shippingMinor: method.priceMinor,
    totalMinor: subtotalMinor + method.priceMinor,
    currency: "RON",
    shippingMethod: method,
  };
}
