"use client";

import { useActionState } from "react";

import { transitionOrderStatus, type OrderStatusActionState } from "@/app/admin/order-actions";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/admin/order-model";

const initialState: OrderStatusActionState = { success: false, message: null };

export function OrderStatusForm({ orderId, requestId, transitions }: { orderId: string; requestId: string; transitions: OrderStatus[] }) {
  const [state, action, pending] = useActionState(transitionOrderStatus.bind(null, orderId), initialState);
  if (transitions.length === 0) {
    return <p className="mt-4 rounded-lg border border-stone-800 p-4 text-sm text-stone-400">Nu există tranziții operaționale permise din starea curentă. Stările Stripe și terminale se schimbă numai prin fluxurile lor autoritare.</p>;
  }
  return (
    <form action={action} className="mt-5 grid gap-4" data-testid="order-status-form">
      <input name="requestId" type="hidden" value={requestId} />
      <label className="grid gap-2 text-sm font-medium">Status nou<select className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2" name="toStatus">{transitions.map((status) => <option key={status} value={status}>{ORDER_STATUS_LABELS[status]}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-medium">Notă opțională<textarea className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2" maxLength={500} name="note" rows={3} /></label>
      {state.message ? <p aria-live="polite" className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-950 text-emerald-200" : "bg-red-950 text-red-200"}`} role="status">{state.message}</p> : null}
      <div><button className="rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Se actualizează…" : "Actualizează statusul"}</button></div>
    </form>
  );
}
