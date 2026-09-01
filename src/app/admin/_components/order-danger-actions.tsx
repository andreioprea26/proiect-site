"use client";

import { useActionState, type FormEvent } from "react";

import {
  cancelOrder,
  refundStripeOrder,
  type OrderOperationActionState,
} from "@/app/admin/order-actions";

const initialState: OrderOperationActionState = { success: false, message: null };

export function OrderDangerActions({
  cancelAvailable,
  cancelRequestId,
  orderId,
  paymentId,
  refundAvailable,
}: {
  cancelAvailable: boolean;
  cancelRequestId: string;
  orderId: string;
  paymentId: string | null;
  refundAvailable: boolean;
}) {
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelOrder.bind(null, orderId),
    initialState,
  );
  const [refundState, refundAction, refundPending] = useActionState(
    refundStripeOrder.bind(null, orderId, paymentId ?? ""),
    initialState,
  );

  if (!cancelAvailable && !refundAvailable) {
    const completedState = cancelState.message ? cancelState : refundState;
    return (
      <div className="mt-4 grid gap-3">
        {completedState.message ? <ActionMessage state={completedState} /> : null}
        <p className="rounded-lg border border-stone-800 p-4 text-sm text-stone-400">Nu există acțiuni financiare sau de anulare disponibile pentru starea curentă.</p>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-5">
      {cancelAvailable ? (
        <form action={cancelAction} className="grid gap-3" data-testid="cancel-order-form" onSubmit={(event) => confirmAction(event, "Confirmi anularea? Pentru COD, inventarul consumat de această comandă va fi restaurat. Pentru Stripe pending, Session va fi expirată înainte de eliberarea rezervării.")}>
          <input name="requestId" type="hidden" value={cancelRequestId} />
          <label className="grid gap-2 text-sm font-medium">Motiv anulare opțional<textarea className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2" maxLength={500} name="note" rows={2} /></label>
          {cancelState.message ? <ActionMessage state={cancelState} /> : null}
          <div><button className="rounded-lg bg-red-700 px-4 py-2.5 font-semibold text-white disabled:opacity-60" disabled={cancelPending} type="submit">{cancelPending ? "Se anulează…" : "Anulează comanda"}</button></div>
        </form>
      ) : null}

      {refundAvailable ? (
        <form action={refundAction} className="grid gap-3" data-testid="refund-order-form" onSubmit={(event) => confirmAction(event, "Această acțiune va solicita rambursarea integrală prin Stripe Test. Inventarul nu va fi restocat automat. Continui?")}>
          <label className="grid gap-2 text-sm font-medium">Motiv refund opțional<textarea className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2" maxLength={500} name="reason" rows={2} /></label>
          {refundState.message ? <ActionMessage state={refundState} /> : null}
          <div><button className="rounded-lg bg-red-700 px-4 py-2.5 font-semibold text-white disabled:opacity-60" disabled={refundPending} type="submit">{refundPending ? "Se inițiază…" : "Refund integral Stripe"}</button></div>
        </form>
      ) : null}
    </div>
  );
}

function confirmAction(event: FormEvent<HTMLFormElement>, message: string) {
  if (!window.confirm(message)) event.preventDefault();
}

function ActionMessage({ state }: { state: OrderOperationActionState }) {
  return <p aria-live="polite" className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-950 text-emerald-200" : "bg-red-950 text-red-200"}`} role="status">{state.message}</p>;
}
