"use client";

import { useActionState } from "react";

import { retryOrderNotification, type OrderOperationActionState } from "@/app/admin/order-actions";
import type { AdminNotification } from "@/lib/admin/orders";

const initialState: OrderOperationActionState = { success: false, message: null };
const dateFormatter = new Intl.DateTimeFormat("ro-RO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Bucharest",
});

const TYPE_LABELS: Record<string, string> = {
  order_confirmation: "Confirmare comandă",
  payment_confirmation: "Confirmare plată",
  awaiting_customization_review: "Verificare personalizare",
  in_progress: "În lucru",
  ready: "Pregătită",
  shipped: "Expediată",
  cancelled: "Anulată",
  refunded: "Refund confirmat",
};

export function NotificationHistory({
  notifications,
  orderId,
  retryRequestIds,
}: {
  notifications: AdminNotification[];
  orderId: string;
  retryRequestIds: Record<string, string>;
}) {
  if (notifications.length === 0) {
    return <p className="mt-4 text-sm text-stone-400">Nu există notificări operaționale pentru această comandă.</p>;
  }
  return (
    <ul className="mt-5 grid gap-4" data-testid="notification-history">
      {notifications.map((notification) => (
        <NotificationRow
          key={notification.id}
          notification={notification}
          orderId={orderId}
          requestId={retryRequestIds[notification.id] ?? ""}
        />
      ))}
    </ul>
  );
}

function NotificationRow({
  notification,
  orderId,
  requestId,
}: {
  notification: AdminNotification;
  orderId: string;
  requestId: string;
}) {
  const [state, action, pending] = useActionState(
    retryOrderNotification.bind(null, orderId, notification.id),
    initialState,
  );
  return (
    <li className="rounded-xl border border-stone-800 bg-stone-950 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{TYPE_LABELS[notification.type] ?? notification.type}</p>
          <p className="mt-1 text-xs text-stone-500">
            {dateFormatter.format(new Date(notification.createdAt))} · sursă {notification.source}
          </p>
        </div>
        <span className={badgeClass(notification.status)}>{notification.status}</span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <Info label="Încercări" value={String(notification.attemptCount)} />
        <Info label="Ultima încercare" value={formatDate(notification.lastAttemptAt)} />
        <Info label="Provider ID" value={truncate(notification.providerMessageId)} />
      </dl>
      {notification.lastError ? <p className="mt-3 rounded-lg bg-red-950 p-3 text-sm text-red-200">Eroare sigură: {notification.lastError}</p> : null}
      {notification.status === "failed" ? (
        <form action={action} className="mt-3" data-testid={`retry-notification-${notification.id}`}>
          <input name="requestId" type="hidden" value={requestId} />
          {state.message ? <p aria-live="polite" className={`mb-3 rounded-lg p-3 text-sm ${state.success ? "bg-emerald-950 text-emerald-200" : "bg-red-950 text-red-200"}`} role="status">{state.message}</p> : null}
          <button className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-300 disabled:opacity-60" disabled={pending} type="submit">
            {pending ? "Se retrimite…" : "Retrimite"}
          </button>
        </form>
      ) : null}
    </li>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</dt><dd className="mt-1 break-words text-stone-200">{value}</dd></div>;
}
function formatDate(value: string | null) { return value ? dateFormatter.format(new Date(value)) : "—"; }
function truncate(value: string | null) { return !value ? "—" : value.length <= 20 ? value : `${value.slice(0, 12)}…${value.slice(-6)}`; }
function badgeClass(status: string) {
  const color = status === "sent" ? "bg-emerald-950 text-emerald-200" : status === "failed" ? "bg-red-950 text-red-200" : "bg-amber-950 text-amber-200";
  return `rounded-full px-3 py-1 text-xs font-semibold uppercase ${color}`;
}
