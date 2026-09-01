import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderStatusForm } from "@/app/admin/_components/order-status-form";
import { OrderDangerActions } from "@/app/admin/_components/order-danger-actions";
import { ShipmentForm } from "@/app/admin/_components/shipment-form";
import { formatMoney } from "@/lib/cart/model";
import { isValidUuid } from "@/lib/admin/catalog-validation";
import { allowedOrderTransitions, canCancelOrder, canConfigureShipment, canMarkOrderShipped, canRefundStripe, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, orderStatusBadgeClass } from "@/lib/admin/order-model";
import { getAdminOrder } from "@/lib/admin/orders";

export const metadata: Metadata = { title: "Detaliu comandă | Admin" };

const dateFormatter = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest" });

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUuid(id)) notFound();
  const order = await getAdminOrder(id);
  if (!order) notFound();
  const hasCustomizations = order.items.some((item) => item.customizationsSnapshot.length > 0);
  const transitions = allowedOrderTransitions({ status: order.status, paymentStatus: order.paymentStatus, hasCustomizations });
  const cancelAvailable = canCancelOrder({ status: order.status, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus });
  const refundAvailable = canRefundStripe({
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    provider: order.payment?.provider ?? null,
    paymentRecordStatus: order.payment?.status ?? null,
    hasFullRefund: order.refunds.some((refund) => ["pending", "succeeded"].includes(refund.status)),
  });

  return (
    <div>
      <Link className="text-sm text-emerald-400 underline-offset-4 hover:underline" href="/admin/orders">← Înapoi la comenzi</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-stone-400">Comandă</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{order.publicNumber}</h1><p className="mt-2 font-mono text-xs text-stone-500">ID intern: {order.id}</p></div><span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${orderStatusBadgeClass(order.status)}`}>{ORDER_STATUS_LABELS[order.status]}</span></div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-stone-800 bg-stone-900 p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold">Identificare și client</h2>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2"><Info label="Creată" value={dateFormatter.format(new Date(order.createdAt))} /><Info label="Tip client" value={order.userId ? "Client autentificat" : "Guest"} /><Info label="Nume" value={addressValue(order.shippingAddress, "recipientName")} /><Info label="E-mail" value={order.email} /><Info label="Telefon" value={order.phone} /><Info label="Ultima actualizare" value={dateFormatter.format(new Date(order.updatedAt))} /></dl>
        </section>
        <section className="rounded-2xl border border-stone-800 bg-stone-900 p-6"><h2 className="text-xl font-semibold">Totaluri</h2><dl className="mt-5 grid gap-4"><Info label="Subtotal" value={formatMoney(order.subtotalMinor)} /><Info label="Livrare" value={formatMoney(order.shippingMinor)} /><Info label="Total" value={formatMoney(order.totalMinor)} /><Info label="Monedă" value={order.currency} /></dl></section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AddressSection title="Livrare" address={order.shippingAddress}><Info label="Metodă" value={`${order.shippingMethodName} (${order.shippingMethodCode})`} /><Info label="Cost" value={formatMoney(order.shippingMinor)} /></AddressSection>
        <AddressSection title="Facturare" address={order.billingAddress}><Info label="Tip" value={order.customerType === "company" ? "Persoană juridică" : "Persoană fizică"} />{order.customerType === "company" ? <><Info label="Companie" value={order.companyName ?? "—"} /><Info label="CUI" value={order.companyTaxId ?? "—"} /><Info label="Nr. înregistrare" value={order.companyRegistrationNumber ?? "—"} /></> : null}<Info label="Aceeași cu livrarea" value={order.billingSameAsShipping ? "Da" : "Nu"} /></AddressSection>
      </div>

      <section className="mt-6 rounded-2xl border border-stone-800 bg-stone-900 p-6">
        <h2 className="text-xl font-semibold">Expediere</h2>
        <p className="mt-2 text-sm text-stone-400">Curierul și AWB-ul sunt introduse manual. Pentru ridicare personală, baza de date adaptează obligativitatea tracking-ului după snapshot-ul metodei de livrare.</p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-4">
          <Info label="Curier" value={order.shipment?.carrier ?? "—"} />
          <Info label="AWB" value={order.shipment?.trackingNumber ?? "—"} />
          <Info label="Tracking" value={order.shipment?.trackingUrl ?? "—"} />
          <Info label="Expediată la" value={formatOptionalDate(order.shipment?.shippedAt ?? null)} />
        </dl>
        {order.shipment?.trackingUrl ? <a className="mt-3 inline-flex text-sm font-semibold text-emerald-400 underline-offset-4 hover:underline" href={order.shipment.trackingUrl} rel="noreferrer" target="_blank">Deschide tracking HTTPS</a> : null}
        <ShipmentForm
          canEdit={canConfigureShipment(order.status)}
          canMarkShipped={canMarkOrderShipped(order.status)}
          configureRequestId={randomUUID()}
          markShippedRequestId={randomUUID()}
          orderId={order.id}
          shipment={order.shipment}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-stone-800 bg-stone-900 p-6"><h2 className="text-xl font-semibold">Produse — snapshot istoric</h2><p className="mt-2 text-sm text-stone-400">Datele de mai jos provin exclusiv din comandă, nu din catalogul actual.</p><div className="mt-5 grid gap-4">{order.items.map((item) => <article className="rounded-xl border border-stone-800 bg-stone-950 p-5" key={item.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{item.productName}</h3><p className="mt-1 text-xs text-stone-500">Snapshot slug: {item.productSlug}</p></div><p className="font-semibold text-emerald-400">{formatMoney(item.lineSubtotalMinor)}</p></div><dl className="mt-4 grid gap-4 sm:grid-cols-4"><Info label="Cantitate" value={String(item.quantity)} /><Info label="Preț bază / buc." value={formatMoney(item.unitBasePriceMinor)} /><Info label="Personalizări / buc." value={formatMoney(item.customizationTotalMinor)} /><Info label="Preț / buc." value={formatMoney(item.unitPriceMinor)} /></dl>{item.variantSnapshot ? <Snapshot title="Variantă" value={variantLabel(item.variantSnapshot)} /> : null}{item.customizationsSnapshot.length > 0 ? <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Personalizări</p><ul className="mt-2 grid gap-2 text-sm text-stone-300">{item.customizationsSnapshot.map((customization, index) => <li className="rounded-lg bg-stone-900 px-3 py-2" key={`${item.id}-${index}`}>{customizationLabel(customization)}</li>)}</ul></div> : null}</article>)}</div></section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-800 bg-stone-900 p-6"><h2 className="text-xl font-semibold">Plată</h2><dl className="mt-5 grid gap-4 sm:grid-cols-2"><Info label="Metodă" value={PAYMENT_METHOD_LABELS[order.paymentMethod]} /><Info label="Status financiar comandă" value={PAYMENT_STATUS_LABELS[order.paymentStatus]} />{order.payment ? <><Info label="Provider" value={order.payment.provider} /><Info label="Status payment record" value={order.payment.status} /><Info label="Sumă payment record" value={formatMoney(order.payment.amountMinor)} /><Info label="PaymentIntent" value={truncateIdentifier(order.payment.providerPaymentId)} /><Info label="Checkout Session" value={truncateIdentifier(order.payment.providerCheckoutSessionId)} /><Info label="Achitat la" value={formatOptionalDate(order.payment.paidAt)} /></> : <Info label="Înregistrare payment" value="Nu există — normal pentru COD în 7A" />}</dl>{order.paymentMethod === "cash_on_delivery" ? <p className="mt-5 rounded-lg bg-amber-950 p-3 text-sm text-amber-200">Schimbarea statusului operațional nu marchează plata ramburs drept încasată. Fluxul de încasare COD nu este inventat în 7A.</p> : <p className="mt-5 rounded-lg bg-sky-950 p-3 text-sm text-sky-200">Plata Stripe poate fi confirmată numai de webhook-ul semnat. Formularul admin nu modifică `payments` sau `payment_status`.</p>}{order.refunds.length > 0 ? <div className="mt-5 border-t border-stone-800 pt-5"><h3 className="font-semibold">Refund-uri</h3><ul className="mt-3 grid gap-3">{order.refunds.map((refund) => <li className="rounded-lg bg-stone-950 p-3 text-sm" key={refund.id}><span className="font-semibold">{refund.status}</span> · {formatMoney(refund.amountMinor)} · {truncateIdentifier(refund.providerRefundId)}{refund.reason ? <span className="block pt-1 text-stone-400">{refund.reason}</span> : null}</li>)}</ul></div> : null}</section>
        <section className="rounded-2xl border border-stone-800 bg-stone-900 p-6"><h2 className="text-xl font-semibold">Schimbă statusul operațional</h2><p className="mt-2 text-sm leading-6 text-stone-400">Tranzițiile sunt validate din nou în baza de date, sub lock. Starea financiară nu este editabilă aici.</p><OrderStatusForm orderId={order.id} requestId={randomUUID()} transitions={transitions} /></section>
      </div>

      <section className="mt-6 rounded-2xl border border-red-950 bg-stone-900 p-6">
        <h2 className="text-xl font-semibold">Acțiuni controlate</h2>
        <p className="mt-2 text-sm leading-6 text-stone-400">Anularea COD restochează numai movement-urile istorice ale comenzii. Stripe paid oferă exclusiv refund integral; finalizarea financiară rămâne autoritatea webhook-ului.</p>
        <OrderDangerActions cancelAvailable={cancelAvailable} cancelRequestId={randomUUID()} orderId={order.id} paymentId={order.payment?.id ?? null} refundAvailable={refundAvailable} />
      </section>

      <section className="mt-6 rounded-2xl border border-stone-800 bg-stone-900 p-6"><h2 className="text-xl font-semibold">Istoric statusuri</h2>{order.history.length === 0 ? <p className="mt-4 text-sm text-stone-400">Nu există intrări de istoric.</p> : <ol className="mt-5 grid gap-4">{order.history.map((entry) => <li className="border-l-2 border-emerald-800 pl-4" key={entry.id}><p className="font-semibold">{entry.fromStatus ? ORDER_STATUS_LABELS[entry.fromStatus] : "Creare"} → {ORDER_STATUS_LABELS[entry.toStatus]}</p><p className="mt-1 text-xs text-stone-500">{dateFormatter.format(new Date(entry.createdAt))} · actor {entry.actorUserId ? truncateIdentifier(entry.actorUserId) : "sistem"}</p>{entry.note ? <p className="mt-2 text-sm text-stone-300">{entry.note}</p> : null}</li>)}</ol>}</section>
    </div>
  );
}

function AddressSection({ address, children, title }: { address: Record<string, unknown>; children: React.ReactNode; title: string }) { return <section className="rounded-2xl border border-stone-800 bg-stone-900 p-6"><h2 className="text-xl font-semibold">{title}</h2><dl className="mt-5 grid gap-4 sm:grid-cols-2">{children}<Info label="Destinatar" value={addressValue(address, "recipientName")} /><Info label="Telefon" value={addressValue(address, "phone")} /><Info label="Adresă" value={[addressValue(address, "addressLine1"), addressValue(address, "addressLine2")].filter((value) => value !== "—").join(", ") || "—"} /><Info label="Localitate / județ" value={`${addressValue(address, "city")} / ${addressValue(address, "county")}`} /><Info label="Cod poștal" value={addressValue(address, "postalCode")} /><Info label="Țară" value={addressValue(address, "countryCode")} /></dl></section>; }
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</dt><dd className="mt-1 break-words text-sm text-stone-200">{value}</dd></div>; }
function Snapshot({ title, value }: { title: string; value: string }) { return <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{title}</p><p className="mt-1 text-sm text-stone-300">{value}</p></div>; }
function addressValue(address: Record<string, unknown>, key: string) { const value = address[key]; return typeof value === "string" && value.trim() ? value : "—"; }
function formatOptionalDate(value: string | null) { return value ? dateFormatter.format(new Date(value)) : "—"; }
function truncateIdentifier(value: string | null) { if (!value) return "—"; return value.length <= 20 ? value : `${value.slice(0, 12)}…${value.slice(-6)}`; }
function variantLabel(snapshot: Record<string, unknown>) { const title = typeof snapshot.title === "string" ? snapshot.title : "Variantă"; const attributes = snapshot.attributes && typeof snapshot.attributes === "object" && !Array.isArray(snapshot.attributes) ? Object.entries(snapshot.attributes as Record<string, unknown>).map(([key, value]) => `${key}: ${String(value)}`).join(", ") : ""; return attributes ? `${title} · ${attributes}` : title; }
function customizationLabel(snapshot: Record<string, unknown>) { const name = typeof snapshot.name === "string" ? snapshot.name : "Personalizare"; const displayValue = typeof snapshot.displayValue === "string" ? snapshot.displayValue : snapshot.value; const price = Number.isSafeInteger(snapshot.additionalCostMinor) ? ` · ${formatMoney(Number(snapshot.additionalCostMinor))}` : ""; return `${name}: ${typeof displayValue === "boolean" ? (displayValue ? "Da" : "Nu") : String(displayValue ?? "—")}${price}`; }
