export const NOTIFICATION_TYPES = [
  "order_confirmation",
  "payment_confirmation",
  "awaiting_customization_review",
  "in_progress",
  "ready",
  "shipped",
  "cancelled",
  "refunded",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type EmailOrderSnapshot = {
  publicNumber: string;
  confirmationUrl: string;
  shippingMethodName: string;
  paymentMethod: "cash_on_delivery" | "card";
  statusLabel: string;
  totalMinor: number;
  currency: string;
  recipientName: string;
  city: string;
  county: string;
  items: Array<{
    productName: string;
    quantity: number;
    lineSubtotalMinor: number;
  }>;
  shipment: {
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
  } | null;
};

export type RenderedOperationalEmail = {
  subject: string;
  html: string;
  text: string;
};

const TITLES: Record<NotificationType, string> = {
  order_confirmation: "Comanda ta a fost înregistrată",
  payment_confirmation: "Plata a fost confirmată",
  awaiting_customization_review: "Personalizarea este în verificare",
  in_progress: "Am început pregătirea comenzii",
  ready: "Comanda este pregătită",
  shipped: "Comanda a fost expediată",
  cancelled: "Comanda a fost anulată",
  refunded: "Rambursarea a fost confirmată",
};

const INTRO: Record<NotificationType, string> = {
  order_confirmation: "Îți mulțumim. Am înregistrat comanda și o vom procesa în curând.",
  payment_confirmation: "Am confirmat încasarea integrală pentru această comandă.",
  awaiting_customization_review: "Detaliile de personalizare sunt verificate manual înainte de producție.",
  in_progress: "Comanda a intrat în lucru.",
  ready: "Comanda este pregătită pentru următorul pas de livrare.",
  shipped: "Coletul a plecat către tine.",
  cancelled: "Anularea comenzii a fost finalizată în sistem.",
  refunded: "Refundul integral a fost confirmat și starea financiară a fost actualizată.",
};

export function renderOperationalEmail(
  type: NotificationType,
  order: EmailOrderSnapshot,
): RenderedOperationalEmail {
  const title = TITLES[type];
  const subject = `${title} · ${order.publicNumber}`;
  const payment = order.paymentMethod === "cash_on_delivery" ? "ramburs" : "card online";
  const itemText = order.items
    .map((item) => `- ${item.productName} × ${item.quantity}: ${money(item.lineSubtotalMinor, order.currency)}`)
    .join("\n");
  const shipmentText = type === "shipped" && order.shipment
    ? `\nCurier: ${order.shipment.carrier ?? "—"}\nAWB: ${order.shipment.trackingNumber ?? "—"}${order.shipment.trackingUrl ? `\nTracking: ${order.shipment.trackingUrl}` : ""}`
    : "";
  const text = [
    `Bună, ${order.recipientName || "client"}!`,
    "",
    INTRO[type],
    `Comandă: ${order.publicNumber}`,
    `Status: ${order.statusLabel}`,
    `Plată: ${payment}`,
    `Livrare: ${order.shippingMethodName} · ${order.city}, ${order.county}`,
    `Total: ${money(order.totalMinor, order.currency)}`,
    shipmentText,
    type === "order_confirmation" ? `\nProduse:\n${itemText}` : "",
    "",
    `Detalii comandă: ${order.confirmationUrl}`,
    "",
    "Brand Handmade",
  ].filter(Boolean).join("\n");

  const shipmentHtml = type === "shipped" && order.shipment
    ? `<div style="margin:16px 0;padding:12px;background:#f5f5f4;border-radius:8px"><strong>Curier:</strong> ${escapeHtml(order.shipment.carrier ?? "—")}<br><strong>AWB:</strong> ${escapeHtml(order.shipment.trackingNumber ?? "—")}${order.shipment.trackingUrl ? `<br><a href="${escapeHtml(order.shipment.trackingUrl)}">Urmărește expedierea</a>` : ""}</div>`
    : "";
  const itemsHtml = type === "order_confirmation"
    ? `<h2 style="font-size:16px">Produse</h2><ul>${order.items.map((item) => `<li>${escapeHtml(item.productName)} × ${item.quantity} — ${escapeHtml(money(item.lineSubtotalMinor, order.currency))}</li>`).join("")}</ul>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#fafaf9;color:#1c1917;font-family:Arial,sans-serif"><main style="max-width:600px;margin:auto;padding:32px 20px"><p style="color:#047857;font-weight:700">Brand Handmade</p><h1 style="font-size:24px">${escapeHtml(title)}</h1><p>Bună, ${escapeHtml(order.recipientName || "client")}!</p><p>${escapeHtml(INTRO[type])}</p><div style="padding:16px;background:#fff;border:1px solid #e7e5e4;border-radius:10px"><strong>${escapeHtml(order.publicNumber)}</strong><br>Status: ${escapeHtml(order.statusLabel)}<br>Plată: ${escapeHtml(payment)}<br>Livrare: ${escapeHtml(order.shippingMethodName)} · ${escapeHtml(order.city)}, ${escapeHtml(order.county)}<br>Total: <strong>${escapeHtml(money(order.totalMinor, order.currency))}</strong></div>${shipmentHtml}${itemsHtml}<p style="margin-top:24px"><a href="${escapeHtml(order.confirmationUrl)}" style="color:#047857">Vezi detaliile comenzii</a></p></main></body></html>`;
  return { subject, html, text };
}

export function maskEmail(value: string) {
  const [local = "", domain = ""] = value.split("@");
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("ro-RO", { style: "currency", currency }).format(value / 100);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] ?? character);
}
