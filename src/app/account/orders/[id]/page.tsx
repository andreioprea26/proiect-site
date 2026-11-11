import Link from "next/link";
import { notFound } from "next/navigation";

import { getCustomerOrder } from "@/lib/account/orders";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/admin/order-model";

const dateFormatter = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest" });
const money = new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" });

export default async function CustomerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getCustomerOrder(id);
  if (!order) notFound();
  return (
    <div>
      <Link className="text-sm font-semibold text-emerald-900 hover:underline" href="/account/orders">← Comenzile mele</Link>
      <header className="mt-5"><p className="text-sm text-stone-600">{dateFormatter.format(new Date(order.createdAt))}</p><h1 className="mt-2 text-3xl font-semibold">Comanda {order.publicNumber}</h1><div className="mt-4 flex flex-wrap gap-2 text-sm"><span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold">{ORDER_STATUS_LABELS[order.status]}</span><span className="rounded-full bg-stone-100 px-3 py-1">{PAYMENT_METHOD_LABELS[order.paymentMethod]} · {PAYMENT_STATUS_LABELS[order.paymentStatus]}</span></div></header>

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Produse</h2><div className="mt-5 grid gap-5">{order.items.map((item) => <article className="border-b border-stone-100 pb-5 last:border-0 last:pb-0" key={item.id}><div className="flex justify-between gap-4"><div><h3 className="font-semibold">{item.productName}</h3>{item.variantSnapshot ? <p className="mt-1 text-sm text-stone-600">{variantLabel(item.variantSnapshot)}</p> : null}{item.customizationsSnapshot.map((customization, index) => <p className="mt-1 text-sm text-stone-600" key={`${item.id}-${index}`}>{customizationLabel(customization)}</p>)}<p className="mt-2 text-sm">{item.quantity} × {money.format(item.unitPriceMinor / 100)}</p></div><p className="font-semibold">{money.format(item.lineSubtotalMinor / 100)}</p></div></article>)}</div><dl className="mt-6 ml-auto grid max-w-sm gap-2 border-t border-stone-200 pt-5 text-sm"><Total label="Subtotal" value={order.subtotalMinor} /><Total label={`Transport · ${order.shippingMethodName}`} value={order.shippingMinor} /><Total label="Total" value={order.totalMinor} strong /></dl></section>

      <div className="mt-6 grid gap-6 md:grid-cols-2"><section className="rounded-xl border border-stone-200 bg-white p-6"><h2 className="text-xl font-semibold">Livrare</h2><address className="mt-4 not-italic leading-7 text-stone-700">{addressLines(order.shippingAddress).map((line) => <span className="block" key={line}>{line}</span>)}</address>{order.shipment ? <div className="mt-5 border-t border-stone-100 pt-4 text-sm"><p><strong>Curier:</strong> {order.shipment.carrier ?? "—"}</p><p className="mt-1"><strong>AWB:</strong> {order.shipment.trackingNumber ?? "—"}</p>{order.shipment.trackingUrl ? <a className="mt-2 inline-block font-semibold text-emerald-900 hover:underline" href={order.shipment.trackingUrl} rel="noreferrer" target="_blank">Urmărește expedierea ↗</a> : null}</div> : <p className="mt-4 text-sm text-stone-500">Tracking-ul va apărea după pregătirea expedierii.</p>}</section>
      <section className="rounded-xl border border-stone-200 bg-white p-6"><h2 className="text-xl font-semibold">Plată și refund</h2><dl className="mt-4 grid gap-3 text-sm"><Info label="Metodă" value={PAYMENT_METHOD_LABELS[order.paymentMethod]} /><Info label="Stare financiară" value={PAYMENT_STATUS_LABELS[order.paymentStatus]} />{order.payment?.paidAt ? <Info label="Achitat la" value={dateFormatter.format(new Date(order.payment.paidAt))} /> : null}{order.codCollection ? <Info label="Încasare ramburs" value={order.codCollection.status === "collected" ? "Încasată" : "Neîncasată"} /> : null}</dl>{order.refunds.length ? <div className="mt-5 border-t border-stone-100 pt-4"><h3 className="font-semibold">Refund-uri</h3>{order.refunds.map((refund, index) => <p className="mt-2 text-sm" key={`${refund.createdAt}-${index}`}>{money.format(refund.amountMinor / 100)} · {refund.status}</p>)}</div> : null}</section></div>
    </div>
  );
}

function Total({ label, strong, value }: { label: string; strong?: boolean; value: number }) { return <div className={`flex justify-between gap-4 ${strong ? "text-base font-semibold" : ""}`}><dt>{label}</dt><dd>{money.format(value / 100)}</dd></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</dt><dd className="mt-1">{value}</dd></div>; }
function text(value: unknown) { return typeof value === "string" && value.trim() ? value : ""; }
function addressLines(address: Record<string, unknown>) { return [text(address.recipientName), text(address.phone), [text(address.addressLine1), text(address.addressLine2)].filter(Boolean).join(", "), [text(address.postalCode), text(address.city), text(address.county)].filter(Boolean).join(", "), text(address.countryCode)].filter(Boolean); }
function variantLabel(snapshot: Record<string, unknown>) { const title = text(snapshot.title) || "Variantă"; const attributes = snapshot.attributes && typeof snapshot.attributes === "object" && !Array.isArray(snapshot.attributes) ? Object.entries(snapshot.attributes as Record<string, unknown>).map(([key, value]) => `${key}: ${String(value)}`).join(", ") : ""; return attributes ? `${title} · ${attributes}` : title; }
function customizationLabel(snapshot: Record<string, unknown>) { const name = text(snapshot.name) || "Personalizare"; const value = typeof snapshot.displayValue === "boolean" ? (snapshot.displayValue ? "Da" : "Nu") : String(snapshot.displayValue ?? snapshot.value ?? "—"); return `${name}: ${value}`; }
