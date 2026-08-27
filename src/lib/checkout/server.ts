import "server-only";

import { createClient } from "@/lib/supabase/server";

import type {
  CheckoutPrefill,
  CodOrderPlacementResult,
  OrderConfirmation,
  CheckoutQuote,
  CheckoutQuoteError,
  CheckoutQuoteLine,
  ShippingMethod,
} from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const placementMessages: Record<string, string> = {
  invalid_idempotency_key: "Reîncarcă pagina de checkout și încearcă din nou.",
  invalid_checkout: "Verifică datele de contact, livrare și facturare.",
  invalid_customer_type: "Tipul de client nu este valid.",
  invalid_billing_choice: "Opțiunea de facturare nu este validă.",
  invalid_company: "Datele companiei nu sunt valide.",
  payment_method_unavailable: "În această etapă este disponibilă numai plata ramburs.",
  shipping_unavailable: "Metoda de livrare nu mai este disponibilă.",
  idempotency_conflict: "Această încercare a fost deja folosită cu alte date. Reîncarcă pagina.",
  cart_invalid: "Coșul s-a schimbat. Verifică produsele înainte de a continua.",
  insufficient_stock: "Cantitatea totală solicitată nu mai este disponibilă.",
  unique_stock_unavailable: "Produsul unicat nu mai este disponibil.",
};

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

export async function placeCodOrder(input: {
  idempotencyKey: string;
  lines: unknown;
  checkout: Record<string, unknown>;
}): Promise<CodOrderPlacementResult> {
  if (!UUID_PATTERN.test(input.idempotencyKey)) {
    return {
      success: false,
      code: "invalid_idempotency_key",
      message: placementMessages.invalid_idempotency_key,
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_cod_order", {
    p_idempotency_key: input.idempotencyKey,
    p_lines: input.lines,
    p_checkout: input.checkout,
  });
  if (error || !isRecord(data) || typeof data.success !== "boolean") {
    return {
      success: false,
      code: "placement_unavailable",
      message: "Comanda nu a putut fi înregistrată momentan. Coșul a fost păstrat.",
    };
  }
  if (!data.success) {
    const code = typeof data.code === "string" ? data.code : "placement_unavailable";
    return {
      success: false,
      code,
      message:
        placementMessages[code] ??
        "Comanda nu a putut fi înregistrată momentan. Coșul a fost păstrat.",
    };
  }
  if (
    typeof data.idempotentReplay !== "boolean" ||
    typeof data.orderId !== "string" ||
    typeof data.publicNumber !== "string" ||
    typeof data.confirmationToken !== "string" ||
    !Number.isSafeInteger(data.subtotalMinor) ||
    !Number.isSafeInteger(data.shippingMinor) ||
    !Number.isSafeInteger(data.totalMinor) ||
    data.currency !== "RON"
  ) {
    return {
      success: false,
      code: "placement_unavailable",
      message: "Comanda a răspuns într-un format neașteptat. Coșul a fost păstrat.",
    };
  }
  return data as CodOrderPlacementResult;
}

export async function getOrderConfirmation(
  token: string,
): Promise<OrderConfirmation | null> {
  if (!UUID_PATTERN.test(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_order_confirmation", {
    p_confirmation_token: token,
  });
  if (
    error ||
    !isRecord(data) ||
    data.found !== true ||
    typeof data.publicNumber !== "string" ||
    !Number.isSafeInteger(data.totalMinor) ||
    data.currency !== "RON" ||
    !["cash_on_delivery", "card"].includes(String(data.paymentMethod)) ||
    !["unpaid", "pending", "paid", "refunded"].includes(
      String(data.paymentStatus),
    ) ||
    typeof data.orderStatus !== "string" ||
    typeof data.shippingMethodName !== "string" ||
    typeof data.createdAt !== "string"
  ) {
    return null;
  }
  return {
    publicNumber: data.publicNumber,
    totalMinor: data.totalMinor as number,
    currency: "RON",
    paymentMethod: data.paymentMethod as "cash_on_delivery" | "card",
    paymentStatus: data.paymentStatus as OrderConfirmation["paymentStatus"],
    orderStatus: data.orderStatus,
    shippingMethodName: data.shippingMethodName,
    createdAt: data.createdAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
