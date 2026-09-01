"use client";

import { useActionState } from "react";

import {
  configureShipment,
  markOrderShipped,
  type OrderOperationActionState,
} from "@/app/admin/order-actions";
import type { AdminShipment } from "@/lib/admin/orders";

const initialState: OrderOperationActionState = { success: false, message: null };

export function ShipmentForm({
  canEdit,
  canMarkShipped,
  configureRequestId,
  markShippedRequestId,
  orderId,
  shipment,
}: {
  canEdit: boolean;
  canMarkShipped: boolean;
  configureRequestId: string;
  markShippedRequestId: string;
  orderId: string;
  shipment: AdminShipment | null;
}) {
  const [configureState, configureAction, configurePending] = useActionState(
    configureShipment.bind(null, orderId),
    initialState,
  );
  const [shipState, shipAction, shipPending] = useActionState(
    markOrderShipped.bind(null, orderId),
    initialState,
  );

  return (
    <div className="mt-5 grid gap-5">
      <form action={configureAction} className="grid gap-4" data-testid="shipment-form">
        <input name="requestId" type="hidden" value={configureRequestId} />
        <label className="grid gap-2 text-sm font-medium">
          Curier
          <input className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2" defaultValue={shipment?.carrier ?? ""} disabled={!canEdit} maxLength={120} name="carrier" placeholder="Exemplu: Curier local" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          AWB / tracking number
          <input className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2" defaultValue={shipment?.trackingNumber ?? ""} disabled={!canEdit} maxLength={160} name="trackingNumber" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          URL tracking HTTPS opțional
          <input className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2" defaultValue={shipment?.trackingUrl ?? ""} disabled={!canEdit} maxLength={2048} name="trackingUrl" placeholder="https://tracking.example.com/..." type="url" />
        </label>
        {configureState.message ? <ActionMessage state={configureState} /> : null}
        {canEdit ? <div><button className="rounded-lg border border-emerald-700 px-4 py-2.5 font-semibold text-emerald-300 disabled:opacity-60" disabled={configurePending} type="submit">{configurePending ? "Se salvează…" : "Salvează expedierea"}</button></div> : null}
      </form>

      {canMarkShipped ? (
        <form action={shipAction} className="grid gap-4 border-t border-stone-800 pt-5" data-testid="mark-shipped-form">
          <input name="requestId" type="hidden" value={markShippedRequestId} />
          <label className="grid gap-2 text-sm font-medium">Notă expediere opțională<textarea className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2" maxLength={500} name="note" rows={2} /></label>
          {shipState.message ? <ActionMessage state={shipState} /> : null}
          <div><button className="rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60" disabled={shipPending} type="submit">{shipPending ? "Se marchează…" : "Marchează drept expediată"}</button></div>
        </form>
      ) : null}
    </div>
  );
}

function ActionMessage({ state }: { state: OrderOperationActionState }) {
  return <p aria-live="polite" className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-950 text-emerald-200" : "bg-red-950 text-red-200"}`} role="status">{state.message}</p>;
}
