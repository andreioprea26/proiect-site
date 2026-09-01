"use server";

import { revalidatePath } from "next/cache";

import { isValidUuid } from "@/lib/admin/catalog-validation";
import { isOrderStatus } from "@/lib/admin/order-model";
import { listAdminOrders, normalizeAdminOrderListInput, type AdminOrderListResult } from "@/lib/admin/orders";
import { requireAdminContext } from "@/lib/admin/server";
import { cancelPendingStripeOrder } from "@/lib/stripe/admin-cancellation";
import { createFullStripeRefund } from "@/lib/stripe/refunds";

export type OrderStatusActionState = {
  success: boolean;
  message: string | null;
};

export type OrderOperationActionState = OrderStatusActionState;

export async function searchAdminOrders(
  _previousState: AdminOrderListResult,
  formData: FormData,
): Promise<AdminOrderListResult> {
  void _previousState;
  return listAdminOrders(normalizeAdminOrderListInput(formData));
}
export async function transitionOrderStatus(
  orderId: string,
  _previousState: OrderStatusActionState,
  formData: FormData,
): Promise<OrderStatusActionState> {
  void _previousState;
  const requestId = String(formData.get("requestId") ?? "");
  const toStatus = String(formData.get("toStatus") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!isValidUuid(orderId) || !isValidUuid(requestId) || !isOrderStatus(toStatus)) {
    return { success: false, message: "Cererea de schimbare a statusului nu este validă." };
  }
  if (note.length > 500) {
    return { success: false, message: "Nota poate avea maximum 500 de caractere." };
  }

  const { supabase } = await requireAdminContext();
  const { data, error } = await supabase.rpc("transition_admin_order_status", {
    p_order_id: orderId,
    p_to_status: toStatus,
    p_request_id: requestId,
    p_note: note || null,
  });
  if (error || typeof data !== "object" || data === null) {
    return { success: false, message: "Statusul nu a putut fi actualizat." };
  }
  const result = data as { success?: unknown; code?: unknown };
  if (result.success !== true) {
    const messages: Record<string, string> = {
      order_not_found: "Comanda nu mai există.",
      invalid_transition: "Tranziția aleasă nu este permisă pentru statusul curent.",
      payment_state_blocks_cancellation: "O comandă achitată sau rambursată nu poate fi anulată prin fluxul operațional.",
      customization_not_required: "Comanda nu conține personalizări care trebuie verificate.",
      idempotency_conflict: "Cererea de actualizare a fost refolosită cu alte date.",
      unauthorized: "Operația este permisă numai unui administrator autentificat.",
    };
    return { success: false, message: messages[String(result.code)] ?? "Tranziția a fost refuzată." };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true, message: "Statusul comenzii a fost actualizat și istoricul a fost înregistrat." };
}

export async function configureShipment(
  orderId: string,
  _previousState: OrderOperationActionState,
  formData: FormData,
): Promise<OrderOperationActionState> {
  void _previousState;
  const requestId = String(formData.get("requestId") ?? "");
  const carrier = String(formData.get("carrier") ?? "").trim();
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();
  const trackingUrl = String(formData.get("trackingUrl") ?? "").trim();
  if (!isValidUuid(orderId) || !isValidUuid(requestId)) return failure("Cererea de expediere nu este validă.");
  if (carrier.length > 120 || trackingNumber.length > 160 || !validTrackingUrl(trackingUrl)) {
    return failure("Verifică numele curierului, AWB-ul și URL-ul HTTPS de tracking.");
  }

  const { supabase } = await requireAdminContext();
  const { data, error } = await supabase.rpc("configure_admin_shipment", {
    p_order_id: orderId,
    p_carrier: carrier || null,
    p_tracking_number: trackingNumber || null,
    p_tracking_url: trackingUrl || null,
    p_request_id: requestId,
  });
  if (error || !isRpcResult(data) || data.success !== true) {
    return failure(operationMessage(data, {
      tracking_required: "Metoda de livrare necesită curier și AWB.",
      shipment_locked: "Expedierea nu mai poate fi modificată pentru această comandă.",
      invalid_shipment: "Datele de expediere nu sunt valide.",
    }, "Expedierea nu a putut fi salvată."));
  }
  revalidateOrder(orderId);
  return success("Datele de expediere au fost salvate și auditate.");
}

export async function markOrderShipped(
  orderId: string,
  _previousState: OrderOperationActionState,
  formData: FormData,
): Promise<OrderOperationActionState> {
  void _previousState;
  const requestId = String(formData.get("requestId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!isValidUuid(orderId) || !isValidUuid(requestId) || note.length > 500) {
    return failure("Cererea de marcare ca expediată nu este validă.");
  }
  const { supabase } = await requireAdminContext();
  const { data, error } = await supabase.rpc("mark_admin_order_shipped", {
    p_order_id: orderId,
    p_request_id: requestId,
    p_note: note || null,
  });
  if (error || !isRpcResult(data) || data.success !== true) {
    return failure(operationMessage(data, {
      invalid_ship_status: "Numai o comandă pregătită poate fi expediată.",
      shipment_required: "Salvează mai întâi datele de expediere.",
      tracking_required: "Metoda de livrare necesită curier și AWB.",
    }, "Comanda nu a putut fi marcată ca expediată."));
  }
  revalidateOrder(orderId);
  return success("Comanda a fost marcată ca expediată, atomic și cu istoric.");
}

export async function cancelOrder(
  orderId: string,
  _previousState: OrderOperationActionState,
  formData: FormData,
): Promise<OrderOperationActionState> {
  void _previousState;
  const requestId = String(formData.get("requestId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!isValidUuid(orderId) || !isValidUuid(requestId) || note.length > 500) {
    return failure("Cererea de anulare nu este validă.");
  }
  const { supabase, user } = await requireAdminContext();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("payment_method")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order) return failure("Comanda nu mai există.");

  if (order.payment_method === "card") {
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();
    if (paymentError || !payment) return failure("Înregistrarea Stripe nu este disponibilă.");
    const result = await cancelPendingStripeOrder({
      paymentId: payment.id,
      actorUserId: user.id,
      requestId,
      ...(note ? { note } : {}),
    });
    if (!result.success) {
      const messages: Record<string, string> = {
        payment_completed_refund_required: "Plata a fost finalizată între timp. Folosește refund integral.",
        stripe_session_still_open: "Sesiunea Stripe este încă deschisă; rezervarea nu a fost eliberată.",
        stripe_session_missing: "Comanda nu are o sesiune Stripe reconciliabilă.",
      };
      return failure(messages[result.code] ?? "Anularea Stripe nu a putut fi reconciliată în siguranță.");
    }
    revalidateOrder(orderId);
    return success("Sesiunea Stripe a fost expirată și anularea a fost reconciliată.");
  }

  const { data, error } = await supabase.rpc("cancel_admin_order", {
    p_order_id: orderId,
    p_request_id: requestId,
    p_note: note || null,
  });
  if (error || !isRpcResult(data) || data.success !== true) {
    return failure(operationMessage(data, {
      refund_required: "Comanda are o stare financiară care necesită refund, nu anulare directă.",
      invalid_cancel_status: "Comanda nu mai este eligibilă pentru anulare.",
      stripe_expiration_required: "Comanda Stripe trebuie anulată prin reconcilierea Session.",
    }, "Comanda nu a putut fi anulată."));
  }
  revalidateOrder(orderId);
  return success("Comanda COD a fost anulată, iar inventarul consumat a fost restaurat exact o dată.");
}

export async function refundStripeOrder(
  orderId: string,
  paymentId: string,
  _previousState: OrderOperationActionState,
  formData: FormData,
): Promise<OrderOperationActionState> {
  void _previousState;
  const reason = String(formData.get("reason") ?? "").trim();
  if (!isValidUuid(orderId) || !isValidUuid(paymentId) || reason.length > 500) {
    return failure("Cererea de refund nu este validă.");
  }
  const { supabase, user } = await requireAdminContext();
  const { data: payment, error } = await supabase
    .from("payments")
    .select("id")
    .eq("id", paymentId)
    .eq("order_id", orderId)
    .maybeSingle();
  if (error || !payment) return failure("Plata nu aparține comenzii selectate.");
  try {
    const result = await createFullStripeRefund({
      paymentId,
      actorUserId: user.id,
      ...(reason ? { reason } : {}),
    });
    if (!result.success) {
      const messages: Record<string, string> = {
        payment_not_refundable: "Plata nu este eligibilă pentru refund integral.",
        admin_required: "Refund-ul poate fi inițiat numai de un administrator.",
      };
      return failure(messages[result.code] ?? "Refund-ul Stripe nu a putut fi inițiat.");
    }
  } catch {
    return failure("Stripe nu a confirmat inițierea refund-ului. Starea financiară nu a fost falsificată.");
  }
  revalidateOrder(orderId);
  return success("Refund-ul integral a fost inițiat în Stripe Test; webhook-ul rămâne autoritar pentru finalizare.");
}

function validTrackingUrl(value: string) {
  if (!value) return true;
  if (value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isRpcResult(value: unknown): value is { success: boolean; code?: string } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && typeof (value as { success?: unknown }).success === "boolean";
}

function operationMessage(
  value: unknown,
  messages: Record<string, string>,
  fallback: string,
) {
  return isRpcResult(value) && value.code ? messages[value.code] ?? fallback : fallback;
}

function revalidateOrder(orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

function success(message: string): OrderOperationActionState {
  return { success: true, message };
}

function failure(message: string): OrderOperationActionState {
  return { success: false, message };
}
