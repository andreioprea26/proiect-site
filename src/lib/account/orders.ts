import "server-only";

import type {
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderStatus,
} from "@/lib/admin/order-model";
import { getAccountContext } from "@/lib/account/server";

export type CustomerOrderListItem = {
  id: string;
  publicNumber: string;
  createdAt: string;
  status: OrderStatus;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: OrderPaymentStatus;
  totalMinor: number;
  currency: string;
};

export type CustomerOrderItem = {
  id: string;
  productName: string;
  productSlug: string;
  variantSnapshot: Record<string, unknown> | null;
  customizationsSnapshot: Record<string, unknown>[];
  unitPriceMinor: number;
  quantity: number;
  lineSubtotalMinor: number;
};

export type CustomerOrderDetail = CustomerOrderListItem & {
  shippingAddress: Record<string, unknown>;
  shippingMethodName: string;
  subtotalMinor: number;
  shippingMinor: number;
  items: CustomerOrderItem[];
  payment: {
    status: string;
    paidAt: string | null;
    refundedAt: string | null;
  } | null;
  codCollection: {
    status: "unpaid" | "collected";
    collectedAt: string | null;
  } | null;
  shipment: {
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: string | null;
  } | null;
  refunds: {
    status: string;
    amountMinor: number;
    currency: string;
    createdAt: string;
    succeededAt: string | null;
  }[];
};

export async function listCustomerOrders(): Promise<CustomerOrderListItem[]> {
  const context = await getAccountContext();
  if (!context) return [];

  const { data, error } = await context.supabase
    .from("orders")
    .select("id, public_number, created_at, status, payment_method, payment_status, total_minor, currency")
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Comenzile nu au putut fi încărcate.");
  return (data ?? []).map((order) => ({
    id: order.id,
    publicNumber: order.public_number,
    createdAt: order.created_at,
    status: order.status as OrderStatus,
    paymentMethod: order.payment_method as OrderPaymentMethod,
    paymentStatus: order.payment_status as OrderPaymentStatus,
    totalMinor: Number(order.total_minor),
    currency: order.currency,
  }));
}

export async function getCustomerOrder(orderId: string): Promise<CustomerOrderDetail | null> {
  const context = await getAccountContext();
  if (!context) return null;

  const { data: order, error: orderError } = await context.supabase
    .from("orders")
    .select("id, public_number, created_at, status, payment_method, payment_status, total_minor, currency, shipping_address, shipping_method_name, subtotal_minor, shipping_minor")
    .eq("id", orderId)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (orderError) throw new Error("Comanda nu a putut fi încărcată.");
  if (!order) return null;

  const [items, payment, codCollection, shipment] = await Promise.all([
    context.supabase.from("order_items")
      .select("id, product_name, product_slug, variant_snapshot, customizations_snapshot, unit_price_minor, quantity, line_subtotal_minor")
      .eq("order_id", order.id).order("created_at"),
    context.supabase.from("payments")
      .select("id, status, paid_at, refunded_at")
      .eq("order_id", order.id).maybeSingle(),
    context.supabase.from("cod_collections")
      .select("status, collected_at")
      .eq("order_id", order.id).maybeSingle(),
    context.supabase.from("shipments")
      .select("carrier, tracking_number, tracking_url, shipped_at")
      .eq("order_id", order.id).maybeSingle(),
  ]);
  if (items.error || payment.error || codCollection.error || shipment.error) {
    throw new Error("Detaliile comenzii nu au putut fi încărcate.");
  }

  const refunds = payment.data
    ? await context.supabase.from("payment_refunds")
      .select("status, amount_minor, currency, created_at, succeeded_at")
      .eq("payment_id", payment.data.id).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (refunds.error) throw new Error("Refund-urile comenzii nu au putut fi încărcate.");

  return {
    id: order.id,
    publicNumber: order.public_number,
    createdAt: order.created_at,
    status: order.status as OrderStatus,
    paymentMethod: order.payment_method as OrderPaymentMethod,
    paymentStatus: order.payment_status as OrderPaymentStatus,
    totalMinor: Number(order.total_minor),
    currency: order.currency,
    shippingAddress: record(order.shipping_address),
    shippingMethodName: order.shipping_method_name,
    subtotalMinor: Number(order.subtotal_minor),
    shippingMinor: Number(order.shipping_minor),
    items: (items.data ?? []).map((item) => ({
      id: item.id,
      productName: item.product_name,
      productSlug: item.product_slug,
      variantSnapshot: item.variant_snapshot ? record(item.variant_snapshot) : null,
      customizationsSnapshot: Array.isArray(item.customizations_snapshot)
        ? item.customizations_snapshot.map(record)
        : [],
      unitPriceMinor: Number(item.unit_price_minor),
      quantity: item.quantity,
      lineSubtotalMinor: Number(item.line_subtotal_minor),
    })),
    payment: payment.data ? {
      status: payment.data.status,
      paidAt: payment.data.paid_at,
      refundedAt: payment.data.refunded_at,
    } : null,
    codCollection: codCollection.data ? {
      status: codCollection.data.status,
      collectedAt: codCollection.data.collected_at,
    } : null,
    shipment: shipment.data ? {
      carrier: shipment.data.carrier,
      trackingNumber: shipment.data.tracking_number,
      trackingUrl: shipment.data.tracking_url,
      shippedAt: shipment.data.shipped_at,
    } : null,
    refunds: (refunds.data ?? []).map((refund) => ({
      status: refund.status,
      amountMinor: Number(refund.amount_minor),
      currency: refund.currency,
      createdAt: refund.created_at,
      succeededAt: refund.succeeded_at,
    })),
  };
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
