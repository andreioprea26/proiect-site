"use client";

import { useActionState, type FormEvent } from "react";

import { collectCodPayment, type OrderOperationActionState } from "@/app/admin/order-actions";

const initialState: OrderOperationActionState = { success: false, message: null };

export function CodCollectionAction({
  available,
  orderId,
  requestId,
}: {
  available: boolean;
  orderId: string;
  requestId: string;
}) {
  const [state, action, pending] = useActionState(
    collectCodPayment.bind(null, orderId),
    initialState,
  );
  if (!available) return state.message ? <Message state={state} /> : null;
  return (
    <form
      action={action}
      className="mt-5 grid gap-3"
      data-testid="cod-collection-form"
      onSubmit={(event) => confirmCollection(event)}
    >
      <input name="requestId" type="hidden" value={requestId} />
      <p className="text-sm text-stone-300">
        Confirmarea marchează numai starea financiară ca achitată. Statusul operațional rămâne neschimbat.
      </p>
      {state.message ? <Message state={state} /> : null}
      <div>
        <button className="rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Se confirmă…" : "Marchează ramburs încasat"}
        </button>
      </div>
    </form>
  );
}

function confirmCollection(event: FormEvent<HTMLFormElement>) {
  if (!window.confirm("Confirmi că suma integrală a comenzii a fost încasată ramburs?")) {
    event.preventDefault();
  }
}

function Message({ state }: { state: OrderOperationActionState }) {
  return <p aria-live="polite" className={`rounded-lg p-3 text-sm ${state.success ? "bg-emerald-950 text-emerald-200" : "bg-red-950 text-red-200"}`} role="status">{state.message}</p>;
}
