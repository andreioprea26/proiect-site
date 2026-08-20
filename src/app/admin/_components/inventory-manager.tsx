"use client";

import { useActionState } from "react";

import { adjustInventory, initializeInventory, updateInventoryThreshold } from "@/app/admin/product-detail-actions";
import type { ProductType } from "@/lib/admin/catalog";
import type { InventoryMovementRecord, InventoryRecord, ProductVariantRecord } from "@/lib/admin/product-details";
import { EMPTY_DETAIL_STATE } from "@/lib/admin/product-details-validation";

import { ActionMessage } from "./action-message";

const inputClass = "mt-2 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-950";
const dateFormatter = new Intl.DateTimeFormat("ro-RO", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Bucharest" });

export function InventoryManager({ inventories, movements, productId, productType, variants }: { inventories: InventoryRecord[]; movements: InventoryMovementRecord[]; productId: string; productType: ProductType; variants: ProductVariantRecord[] }) {
  const directInventory = inventories.find((inventory) => inventory.product_id === productId);
  const inventoryLabels = new Map<string, string>();
  if (directInventory) inventoryLabels.set(directInventory.id, "Produs");
  variants.forEach((variant) => {
    const inventory = inventories.find((item) => item.variant_id === variant.id);
    if (inventory) inventoryLabels.set(inventory.id, variant.title);
  });

  return (
    <section className="rounded-2xl border border-stone-800 bg-stone-900 p-6" id="inventar">
      <h2 className="text-2xl font-semibold">Inventar</h2>
      <p className="mt-2 text-sm text-stone-300">Cantitatea se schimbă exclusiv prin ajustări auditate. Inventarul poate rămâne neconfigurat pentru produse fără stoc fizic.</p>
      {productType === "unique" ? <p className="mt-4 rounded-lg bg-amber-950 p-3 text-sm text-amber-200">Produs unicat: stocul total este limitat de baza de date la maximum 1.</p> : null}
      <div className="mt-6 grid gap-5">
        {variants.length === 0 ? (
          directInventory
            ? <InventoryCard inventory={directInventory} label="Produs" productId={productId} />
            : <InventoryInitializer label="produs" productId={productId} variantId={null} />
        ) : (
          variants.map((variant) => {
            const inventory = inventories.find((item) => item.variant_id === variant.id);
            return inventory
              ? <InventoryCard inventory={inventory} key={variant.id} label={variant.title} productId={productId} />
              : <InventoryInitializer key={variant.id} label={variant.title} productId={productId} variantId={variant.id} />;
          })
        )}
      </div>
      <div className="mt-8 border-t border-stone-800 pt-6">
        <h3 className="text-lg font-semibold">Istoric ajustări</h3>
        {movements.length === 0 ? <p className="mt-3 text-sm text-stone-400">Nu există mișcări de inventar.</p> : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-stone-800">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-stone-950 text-stone-300"><tr><th className="px-3 py-2">Data</th><th className="px-3 py-2">Țintă</th><th className="px-3 py-2">Înainte</th><th className="px-3 py-2">Diferență</th><th className="px-3 py-2">După</th><th className="px-3 py-2">Motiv</th><th className="px-3 py-2">Actor</th></tr></thead>
              <tbody className="divide-y divide-stone-800">{movements.map((movement) => <tr key={movement.id}><td className="px-3 py-3">{dateFormatter.format(new Date(movement.created_at))}</td><td className="px-3 py-3">{inventoryLabels.get(movement.inventory_id) ?? "Inventar eliminat"}</td><td className="px-3 py-3">{movement.quantity_before}</td><td className={`px-3 py-3 font-semibold ${movement.quantity_delta > 0 ? "text-emerald-400" : "text-red-300"}`}>{movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta}</td><td className="px-3 py-3">{movement.quantity_after}</td><td className="px-3 py-3">{movement.reason ?? "—"}</td><td className="px-3 py-3 font-mono text-xs">{movement.actor_user_id ?? "sistem"}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function InventoryInitializer({ label, productId, variantId }: { label: string; productId: string; variantId: string | null }) {
  const [state, action, pending] = useActionState(initializeInventory.bind(null, productId, variantId), EMPTY_DETAIL_STATE);
  return (
    <article className="rounded-xl border border-dashed border-stone-700 p-5">
      <h3 className="font-semibold">{label}</h3>
      <p className="mt-2 text-sm text-stone-400">Inventar neconfigurat. Îl poți lăsa astfel sau îl poți inițializa cu 0.</p>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,15rem)_auto] sm:items-end" noValidate>
        <Field error={state.fieldErrors.threshold} id={`init-${variantId ?? "product"}-threshold`} label="Prag stoc redus"><input className={inputClass} id={`init-${variantId ?? "product"}-threshold`} min="0" name="threshold" type="number" /></Field>
        <button className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold disabled:opacity-60" disabled={pending} type="submit">{pending ? "Se inițializează…" : "Inițializează inventarul"}</button>
        <div className="sm:col-span-2"><ActionMessage state={state} /></div>
      </form>
    </article>
  );
}

function InventoryCard({ inventory, label, productId }: { inventory: InventoryRecord; label: string; productId: string }) {
  const [thresholdState, thresholdAction, thresholdPending] = useActionState(updateInventoryThreshold.bind(null, productId, inventory.id), EMPTY_DETAIL_STATE);
  const [adjustState, adjustAction, adjustPending] = useActionState(adjustInventory.bind(null, productId, inventory.id), EMPTY_DETAIL_STATE);
  return (
    <article className="rounded-xl border border-stone-700 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{label}</h3><p className="text-2xl font-semibold text-emerald-400">{inventory.quantity} buc.</p></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <form action={thresholdAction} className="grid gap-3" noValidate>
          <Field error={thresholdState.fieldErrors.threshold} id={`${inventory.id}-threshold`} label="Prag stoc redus"><input className={inputClass} defaultValue={inventory.low_stock_threshold ?? ""} id={`${inventory.id}-threshold`} min="0" name="threshold" type="number" /></Field>
          <ActionMessage state={thresholdState} />
          <div><button className="rounded-lg border border-stone-600 px-4 py-2 text-sm font-semibold disabled:opacity-60" disabled={thresholdPending} type="submit">{thresholdPending ? "Se salvează…" : "Salvează pragul"}</button></div>
        </form>
        <form action={adjustAction} className="grid gap-3" noValidate>
          <Field error={adjustState.fieldErrors.delta} id={`${inventory.id}-delta`} label="Ajustare (+/-)"><input className={inputClass} id={`${inventory.id}-delta`} name="delta" placeholder="ex. 5 sau -2" required type="number" /></Field>
          <Field error={adjustState.fieldErrors.reason} id={`${inventory.id}-reason`} label="Motiv opțional"><input className={inputClass} id={`${inventory.id}-reason`} maxLength={500} name="reason" /></Field>
          <ActionMessage state={adjustState} />
          <div><button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold disabled:opacity-60" disabled={adjustPending} type="submit">{adjustPending ? "Se ajustează…" : "Ajustează stocul"}</button></div>
        </form>
      </div>
    </article>
  );
}

function Field({ children, error, id, label }: { children: React.ReactNode; error?: string; id: string; label: string }) {
  return <div><label className="block text-sm font-medium" htmlFor={id}>{label}</label>{children}{error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}</div>;
}
