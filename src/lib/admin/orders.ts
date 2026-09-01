import "server-only";

import { requireAdminContext } from "@/lib/admin/server";
import {
  isOrderPaymentMethod,
  isOrderPaymentStatus,
  isOrderStatus,
  type OrderPaymentMethod,
  type OrderPaymentStatus,
  type OrderStatus,
} from "@/lib/admin/order-model";

export const ADMIN_ORDERS_PAGE_SIZE = 20;

export type AdminOrderListItem = {
  id: string;
  publicNumber: string;
  createdAt: string;
  customerName: string;
  email: string;
  totalMinor: number;
  currency: string;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: OrderPaymentStatus;
  status: OrderStatus;
  shippingMethodName: string;
};

export type AdminOrderListInput = {
  search: string;
  status: OrderStatus | "";
  paymentMethod: OrderPaymentMethod | "";
  paymentStatus: OrderPaymentStatus | "";
  page: number;
};

export type AdminOrderListResult = AdminOrderListInput & {
  orders: AdminOrderListItem[];
  total: number;
  totalPages: number;
};

export type AdminOrderDetail = {
  id: string;
  publicNumber: string;
  userId: string | null;
  email: string;
  phone: string;
  customerType: "individual" | "company";
  companyName: string | null;
  companyTaxId: string | null;
  companyRegistrationNumber: string | null;
  shippingAddress: Record<string, unknown>;
  billingSameAsShipping: boolean;
  billingAddress: Record<string, unknown>;
  shippingMethodCode: string;
  shippingMethodName: string;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: OrderPaymentStatus;
  status: OrderStatus;
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: AdminOrderItem[];
  payment: AdminPayment | null;
  refunds: AdminRefund[];
  history: AdminOrderHistory[];
};

export type AdminOrderItem = {
  id: string;
  productName: string;
  productSlug: string;
  variantSnapshot: Record<string, unknown> | null;
  customizationsSnapshot: Record<string, unknown>[];
  unitBasePriceMinor: number;
  customizationTotalMinor: number;
  unitPriceMinor: number;
  quantity: number;
  lineSubtotalMinor: number;
};

export type AdminPayment = {
  id: string;
  provider: string;
  status: string;
  amountMinor: number;
  currency: string;
  providerPaymentId: string | null;
  providerCheckoutSessionId: string | null;
  paidAt: string | null;
  expiredAt: string | null;
  refundedAt: string | null;
};

export type AdminRefund = {
  id: string;
  status: string;
  amountMinor: number;
  currency: string;
  providerRefundId: string | null;
  reason: string | null;
  createdAt: string;
  succeededAt: string | null;
};

export type AdminOrderHistory = {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorUserId: string | null;
  note: string | null;
  createdAt: string;
};

export function normalizeAdminOrderListInput(formData?: FormData): AdminOrderListInput {
  const search = String(formData?.get("search") ?? "").trim().slice(0, 254);
  const rawStatus = String(formData?.get("status") ?? "");
  const rawMethod = String(formData?.get("paymentMethod") ?? "");
  const rawPaymentStatus = String(formData?.get("paymentStatus") ?? "");
  const rawPage = Number(formData?.get("page") ?? 1);
  return {
    search,
    status: isOrderStatus(rawStatus) ? rawStatus : "",
    paymentMethod: isOrderPaymentMethod(rawMethod) ? rawMethod : "",
    paymentStatus: isOrderPaymentStatus(rawPaymentStatus) ? rawPaymentStatus : "",
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}
export async function listAdminOrders(input: AdminOrderListInput): Promise<AdminOrderListResult> {
  const { supabase } = await requireAdminContext();
  let query = supabase
    .from("orders")
    .select("id, public_number, email, shipping_address, payment_method, payment_status, status, total_minor, currency, shipping_method_name, created_at", { count: "exact" });

  if (input.search) {
    const escaped = input.search.replaceAll("%", "\\%").replaceAll("_", "\\_");
    query = input.search.includes("@")
      ? query.ilike("email", `%${escaped}%`)
      : query.ilike("public_number", `%${escaped}%`);
  }
  if (input.status) query = query.eq("status", input.status);
  if (input.paymentMethod) query = query.eq("payment_method", input.paymentMethod);
  if (input.paymentStatus) query = query.eq("payment_status", input.paymentStatus);

  const start = (input.page - 1) * ADMIN_ORDERS_PAGE_SIZE;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(start, start + ADMIN_ORDERS_PAGE_SIZE - 1);
  if (error) throw new Error("Comenzile nu au putut fi încărcate.");

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_ORDERS_PAGE_SIZE));
  if (input.page > totalPages) return listAdminOrders({ ...input, page: totalPages });

  return {
    ...input,
    total,
    totalPages,
    orders: (data ?? []).map((order) => ({
      id: order.id,
      publicNumber: order.public_number,
      createdAt: order.created_at,
      customerName: addressString(order.shipping_address, "recipientName") || "Client fără nume",
      email: order.email,
      totalMinor: Number(order.total_minor),
      currency: order.currency,
      paymentMethod: order.payment_method as OrderPaymentMethod,
      paymentStatus: order.payment_status as OrderPaymentStatus,
      status: order.status as OrderStatus,
      shippingMethodName: order.shipping_method_name,
    })),
  };
}

export async function getAdminOrder(orderId: string): Promise<AdminOrderDetail | null> {
  const { supabase } = await requireAdminContext();
  const [orderResult, itemsResult, historyResult] = await Promise.all([
    supabase.from("orders").select("id, public_number, user_id, email, phone, customer_type, company_name, company_tax_id, company_registration_number, shipping_address, billing_same_as_shipping, billing_address, shipping_method_code, shipping_method_name, payment_method, payment_status, status, subtotal_minor, shipping_minor, total_minor, currency, created_at, updated_at").eq("id", orderId).maybeSingle(),
    supabase.from("order_items").select("id, product_name, product_slug, variant_snapshot, customizations_snapshot, unit_base_price_minor, customization_total_minor, unit_price_minor, quantity, line_subtotal_minor").eq("order_id", orderId).order("created_at"),
    supabase.from("order_status_history").select("id, from_status, to_status, actor_user_id, note, created_at").eq("order_id", orderId).order("created_at"),
  ]);
  if (orderResult.error || itemsResult.error || historyResult.error) {
    throw new Error("Comanda nu a putut fi încărcată complet.");
  }
  if (!orderResult.data) return null;

  const paymentResult = await supabase.from("payments").select("id, provider, status, amount_minor, currency, provider_payment_id, provider_checkout_session_id, paid_at, expired_at, refunded_at").eq("order_id", orderId).maybeSingle();
  if (paymentResult.error) throw new Error("Plata comenzii nu a putut fi încărcată.");
  const refundResult = paymentResult.data
    ? await supabase.from("payment_refunds").select("id, status, amount_minor, currency, provider_refund_id, reason, created_at, succeeded_at").eq("payment_id", paymentResult.data.id).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (refundResult.error) throw new Error("Refund-urile comenzii nu au putut fi încărcate.");

  const order = orderResult.data;
  return {
    id: order.id,
    publicNumber: order.public_number,
    userId: order.user_id,
    email: order.email,
    phone: order.phone,
    customerType: order.customer_type,
    companyName: order.company_name,
    companyTaxId: order.company_tax_id,
    companyRegistrationNumber: order.company_registration_number,
    shippingAddress: record(order.shipping_address),
    billingSameAsShipping: order.billing_same_as_shipping,
    billingAddress: record(order.billing_address),
    shippingMethodCode: order.shipping_method_code,
    shippingMethodName: order.shipping_method_name,
    paymentMethod: order.payment_method as OrderPaymentMethod,
    paymentStatus: order.payment_status as OrderPaymentStatus,
    status: order.status as OrderStatus,
    subtotalMinor: Number(order.subtotal_minor),
    shippingMinor: Number(order.shipping_minor),
    totalMinor: Number(order.total_minor),
    currency: order.currency,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items: (itemsResult.data ?? []).map((item) => ({
      id: item.id,
      productName: item.product_name,
      productSlug: item.product_slug,
      variantSnapshot: item.variant_snapshot ? record(item.variant_snapshot) : null,
      customizationsSnapshot: Array.isArray(item.customizations_snapshot)
        ? item.customizations_snapshot.map(record)
        : [],
      unitBasePriceMinor: Number(item.unit_base_price_minor),
      customizationTotalMinor: Number(item.customization_total_minor),
      unitPriceMinor: Number(item.unit_price_minor),
      quantity: item.quantity,
      lineSubtotalMinor: Number(item.line_subtotal_minor),
    })),
    payment: paymentResult.data ? {
      id: paymentResult.data.id,
      provider: paymentResult.data.provider,
      status: paymentResult.data.status,
      amountMinor: Number(paymentResult.data.amount_minor),
      currency: paymentResult.data.currency,
      providerPaymentId: paymentResult.data.provider_payment_id,
      providerCheckoutSessionId: paymentResult.data.provider_checkout_session_id,
      paidAt: paymentResult.data.paid_at,
      expiredAt: paymentResult.data.expired_at,
      refundedAt: paymentResult.data.refunded_at,
    } : null,
    refunds: (refundResult.data ?? []).map((refund) => ({
      id: refund.id,
      status: refund.status,
      amountMinor: Number(refund.amount_minor),
      currency: refund.currency,
      providerRefundId: refund.provider_refund_id,
      reason: refund.reason,
      createdAt: refund.created_at,
      succeededAt: refund.succeeded_at,
    })),
    history: (historyResult.data ?? []).map((entry) => ({
      id: entry.id,
      fromStatus: entry.from_status as OrderStatus | null,
      toStatus: entry.to_status as OrderStatus,
      actorUserId: entry.actor_user_id,
      note: entry.note,
      createdAt: entry.created_at,
    })),
  };
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function addressString(value: unknown, key: string) {
  const item = record(value)[key];
  return typeof item === "string" ? item : "";
}
