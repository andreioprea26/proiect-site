"use client";

import Link from "next/link";
import { useActionState } from "react";

import { searchAdminOrders } from "@/app/admin/order-actions";
import { formatMoney } from "@/lib/cart/model";
import {
  ORDER_PAYMENT_METHODS,
  ORDER_PAYMENT_STATUSES,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  orderStatusBadgeClass,
} from "@/lib/admin/order-model";
import type { AdminOrderListResult } from "@/lib/admin/orders";

const dateFormatter = new Intl.DateTimeFormat("ro-RO", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Bucharest",
});

const inputClass = "rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-950";

export function OrdersList({ initialState }: { initialState: AdminOrderListResult }) {
  const [state, action, pending] = useActionState(searchAdminOrders, initialState);
  const formKey = [state.search, state.status, state.paymentMethod, state.paymentStatus].join("|");

  return (
    <div className="mt-8">
      <form action={action} className="grid gap-4 rounded-2xl border border-stone-800 bg-stone-900 p-5 lg:grid-cols-5" key={formKey}>
        <label className="grid gap-2 text-sm font-medium lg:col-span-2">
          Număr comandă sau e-mail
          <input className={inputClass} defaultValue={state.search} maxLength={254} name="search" placeholder="CMD-2026-… sau client@…" />
        </label>
        <Filter label="Status comandă" name="status" defaultValue={state.status} options={ORDER_STATUSES.map((value) => ({ value, label: ORDER_STATUS_LABELS[value] }))} />
        <Filter label="Metodă plată" name="paymentMethod" defaultValue={state.paymentMethod} options={ORDER_PAYMENT_METHODS.map((value) => ({ value, label: PAYMENT_METHOD_LABELS[value] }))} />
        <Filter label="Status plată" name="paymentStatus" defaultValue={state.paymentStatus} options={ORDER_PAYMENT_STATUSES.map((value) => ({ value, label: PAYMENT_STATUS_LABELS[value] }))} />
        <div className="flex flex-wrap items-center gap-3 lg:col-span-5">
          <button className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} name="page" type="submit" value="1">
            {pending ? "Se încarcă…" : "Caută și filtrează"}
          </button>
          <p className="text-sm text-stone-400">{state.total} {state.total === 1 ? "comandă" : "comenzi"}</p>
          <p className="text-xs text-stone-500">Căutarea este trimisă prin POST; e-mailul nu ajunge în URL.</p>
        </div>
      </form>

      {state.orders.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-stone-700 p-6 text-stone-400">Nu există comenzi pentru criteriile alese.</p>
      ) : (
        <>
          <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-stone-800 md:block">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-stone-900 text-stone-300"><tr><Th>Comandă</Th><Th>Data</Th><Th>Client</Th><Th>Total</Th><Th>Plată</Th><Th>Status plată</Th><Th>Status comandă</Th><Th>Livrare</Th><Th><span className="sr-only">Acțiuni</span></Th></tr></thead>
              <tbody className="divide-y divide-stone-800">
                {state.orders.map((order) => (
                  <tr className="bg-stone-950" key={order.id}>
                    <Td><span className="font-semibold text-stone-100">{order.publicNumber}</span></Td>
                    <Td>{dateFormatter.format(new Date(order.createdAt))}</Td>
                    <Td><span className="block text-stone-100">{order.customerName}</span><span className="text-xs">{order.email}</span></Td>
                    <Td>{formatMoney(order.totalMinor)}</Td>
                    <Td>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</Td>
                    <Td>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</Td>
                    <Td><StatusBadge status={order.status} /></Td>
                    <Td>{order.shippingMethodName}</Td>
                    <Td><Link className="font-semibold text-emerald-400 underline-offset-4 hover:underline" href={`/admin/orders/${order.id}`}>Deschide</Link></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 grid gap-4 md:hidden">
            {state.orders.map((order) => (
              <article className="rounded-2xl border border-stone-800 bg-stone-900 p-5" key={order.id}>
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{order.publicNumber}</p><p className="mt-1 text-xs text-stone-400">{dateFormatter.format(new Date(order.createdAt))}</p></div><StatusBadge status={order.status} /></div>
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><Info label="Client" value={`${order.customerName} · ${order.email}`} /><Info label="Total" value={formatMoney(order.totalMinor)} /><Info label="Plată" value={`${PAYMENT_METHOD_LABELS[order.paymentMethod]} · ${PAYMENT_STATUS_LABELS[order.paymentStatus]}`} /><Info label="Livrare" value={order.shippingMethodName} /></dl>
                <Link className="mt-5 inline-flex font-semibold text-emerald-400 underline-offset-4 hover:underline" href={`/admin/orders/${order.id}`}>Deschide comanda</Link>
              </article>
            ))}
          </div>
        </>
      )}

      <form action={action} className="mt-6 flex items-center justify-between gap-4">
        <input name="search" type="hidden" value={state.search} /><input name="status" type="hidden" value={state.status} /><input name="paymentMethod" type="hidden" value={state.paymentMethod} /><input name="paymentStatus" type="hidden" value={state.paymentStatus} />
        <button className="rounded-lg border border-stone-700 px-4 py-2 text-sm font-semibold disabled:opacity-40" disabled={pending || state.page <= 1} name="page" value={state.page - 1}>← Anterioare</button>
        <p className="text-sm text-stone-400">Pagina {state.page} din {state.totalPages}</p>
        <button className="rounded-lg border border-stone-700 px-4 py-2 text-sm font-semibold disabled:opacity-40" disabled={pending || state.page >= state.totalPages} name="page" value={state.page + 1}>Următoare →</button>
      </form>
    </div>
  );
}

function Filter({ defaultValue, label, name, options }: { defaultValue: string; label: string; name: string; options: { value: string; label: string }[] }) {
  return <label className="grid gap-2 text-sm font-medium">{label}<select className={inputClass} defaultValue={defaultValue} name={name}><option value="">Toate</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function StatusBadge({ status }: { status: AdminOrderListResult["orders"][number]["status"] }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusBadgeClass(status)}`}>{ORDER_STATUS_LABELS[status]}</span>;
}

function Th({ children }: { children: React.ReactNode }) { return <th className="px-3 py-3 font-medium">{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-3 py-4 text-stone-300">{children}</td>; }
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs uppercase tracking-wide text-stone-500">{label}</dt><dd className="mt-1 break-words text-stone-200">{value}</dd></div>; }
