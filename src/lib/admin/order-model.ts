export const ORDER_STATUSES = [
  "new",
  "awaiting_payment",
  "paid",
  "awaiting_customization_review",
  "in_progress",
  "ready",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
  "returned",
] as const;

export const ORDER_PAYMENT_METHODS = ["cash_on_delivery", "card"] as const;
export const ORDER_PAYMENT_STATUSES = ["unpaid", "pending", "paid", "refunded"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderPaymentMethod = (typeof ORDER_PAYMENT_METHODS)[number];
export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Nouă",
  awaiting_payment: "Așteaptă plata",
  paid: "Plătită",
  awaiting_customization_review: "Așteaptă verificarea personalizării",
  in_progress: "În lucru",
  ready: "Pregătită",
  shipped: "Expediată",
  completed: "Finalizată",
  cancelled: "Anulată",
  refunded: "Rambursată",
  returned: "Returnată",
};

export const PAYMENT_METHOD_LABELS: Record<OrderPaymentMethod, string> = {
  cash_on_delivery: "Ramburs",
  card: "Card online",
};

export const PAYMENT_STATUS_LABELS: Record<OrderPaymentStatus, string> = {
  unpaid: "Neachitată",
  pending: "În așteptare",
  paid: "Achitată",
  refunded: "Rambursată",
};

const baseTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ["awaiting_customization_review", "in_progress", "cancelled"],
  awaiting_payment: [],
  paid: ["awaiting_customization_review", "in_progress"],
  awaiting_customization_review: ["in_progress", "cancelled"],
  in_progress: ["ready", "cancelled"],
  ready: ["shipped", "cancelled"],
  shipped: ["completed", "returned"],
  completed: ["returned"],
  cancelled: [],
  refunded: [],
  returned: [],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}
export function isOrderPaymentMethod(value: unknown): value is OrderPaymentMethod {
  return ORDER_PAYMENT_METHODS.includes(value as OrderPaymentMethod);
}

export function isOrderPaymentStatus(value: unknown): value is OrderPaymentStatus {
  return ORDER_PAYMENT_STATUSES.includes(value as OrderPaymentStatus);
}

export function allowedOrderTransitions(input: {
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  hasCustomizations: boolean;
}) {
  return baseTransitions[input.status].filter((status) => {
    if (status === "awaiting_customization_review") return input.hasCustomizations;
    if (status === "cancelled") {
      return input.paymentStatus !== "paid" && input.paymentStatus !== "refunded";
    }
    return true;
  });
}

export function orderStatusBadgeClass(status: OrderStatus) {
  if (["completed", "paid"].includes(status)) return "bg-emerald-950 text-emerald-200";
  if (["cancelled", "refunded", "returned"].includes(status)) return "bg-red-950 text-red-200";
  if (["awaiting_payment", "awaiting_customization_review"].includes(status)) {
    return "bg-amber-950 text-amber-200";
  }
  return "bg-sky-950 text-sky-200";
}
