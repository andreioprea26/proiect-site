"use server";

import { revalidatePath } from "next/cache";

import { isValidUuid } from "@/lib/admin/catalog-validation";
import { isOrderStatus } from "@/lib/admin/order-model";
import { listAdminOrders, normalizeAdminOrderListInput, type AdminOrderListResult } from "@/lib/admin/orders";
import { requireAdminContext } from "@/lib/admin/server";

export type OrderStatusActionState = {
  success: boolean;
  message: string | null;
};

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
