import Link from "next/link";

import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/admin/order-model";
import { listCustomerOrders } from "@/lib/account/orders";

const dateFormatter = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest" });
const money = new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" });

export default async function CustomerOrdersPage() {
  const orders = await listCustomerOrders();
  return (
    <section>
      <p className="text-sm font-medium text-brand">Cont client</p>
      <h1 className="mt-2 text-3xl font-semibold">Comenzile mele</h1>
      <p className="mt-3 text-brand-muted">Istoricul comenzilor asociate contului tău.</p>
      {orders.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-brand-border bg-brand-surface p-6">
          <p className="text-brand-muted">Nu ai încă nicio comandă asociată contului.</p>
          <Link className="mt-4 inline-block font-semibold text-brand" href="/shop">Descoperă produsele →</Link>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-brand-border/25 bg-brand-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-brand-border/25 bg-stone-50"><tr><th className="p-4">Comandă</th><th className="p-4">Data</th><th className="p-4">Status</th><th className="p-4">Plată</th><th className="p-4">Total</th><th className="p-4"><span className="sr-only">Acțiuni</span></th></tr></thead>
            <tbody>{orders.map((order) => <tr className="border-b border-stone-100 last:border-0" key={order.id}><td className="p-4 font-semibold">{order.publicNumber}</td><td className="p-4">{dateFormatter.format(new Date(order.createdAt))}</td><td className="p-4">{ORDER_STATUS_LABELS[order.status]}</td><td className="p-4">{PAYMENT_METHOD_LABELS[order.paymentMethod]} · {PAYMENT_STATUS_LABELS[order.paymentStatus]}</td><td className="p-4 font-semibold">{money.format(order.totalMinor / 100)}</td><td className="p-4"><Link className="font-semibold text-brand hover:underline" href={`/account/orders/${order.id}`}>Detalii</Link></td></tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
