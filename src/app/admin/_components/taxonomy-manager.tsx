"use client";

import { useActionState } from "react";

import {
  createCategory,
  createCollection,
  deleteCategory,
  deleteCollection,
  updateCategory,
  updateCollection,
} from "@/app/admin/catalog-actions";
import type { TaxonomyRecord } from "@/lib/admin/catalog";
import { EMPTY_ACTION_STATE } from "@/lib/admin/catalog-validation";

import { ActionMessage } from "./action-message";

type TaxonomyManagerProps = {
  items: TaxonomyRecord[];
  kind: "category" | "collection";
};

const inputClass =
  "mt-2 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-950";

export function TaxonomyManager({ items, kind }: TaxonomyManagerProps) {
  const createAction = kind === "category" ? createCategory : createCollection;
  const [state, formAction, isPending] = useActionState(createAction, EMPTY_ACTION_STATE);
  const singular = kind === "category" ? "categoria" : "colecția";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <section aria-labelledby="taxonomy-list-title">
        <h2 className="text-xl font-semibold" id="taxonomy-list-title">
          Înregistrări existente
        </h2>
        {items.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-stone-700 p-5 text-stone-400">
            Nu există încă înregistrări.
          </p>
        ) : (
          <div className="mt-4 grid gap-4">
            {items.map((item) => (
              <TaxonomyEditor item={item} key={item.id} kind={kind} />
            ))}
          </div>
        )}
      </section>

      <section className="h-fit rounded-2xl border border-stone-800 bg-stone-900 p-5" aria-labelledby="taxonomy-create-title">
        <h2 className="text-xl font-semibold" id="taxonomy-create-title">
          Adaugă {singular}
        </h2>
        <form action={formAction} className="mt-4 grid gap-4" noValidate>
          <TaxonomyFields prefix="new" state={state} />
          <ActionMessage state={state} />
          <button
            className="rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Se adaugă…" : "Adaugă"}
          </button>
        </form>
      </section>
    </div>
  );
}

function TaxonomyEditor({ item, kind }: { item: TaxonomyRecord; kind: TaxonomyManagerProps["kind"] }) {
  const updateAction = kind === "category" ? updateCategory.bind(null, item.id) : updateCollection.bind(null, item.id);
  const removeAction = kind === "category" ? deleteCategory.bind(null, item.id) : deleteCollection.bind(null, item.id);
  const [state, formAction, isPending] = useActionState(updateAction, EMPTY_ACTION_STATE);

  return (
    <article className="rounded-2xl border border-stone-800 bg-stone-900 p-5">
      <form action={formAction} className="grid gap-4" noValidate>
        <TaxonomyFields item={item} prefix={item.id} state={state} />
        <ActionMessage state={state} />
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-lg bg-stone-100 px-4 py-2 font-semibold text-stone-950 disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Se salvează…" : "Salvează"}
          </button>
        </div>
      </form>
      <form
        action={removeAction}
        className="mt-3"
        onSubmit={(event) => {
          if (!window.confirm("Ștergi această înregistrare? Asocierile cu produsele vor fi eliminate.")) {
            event.preventDefault();
          }
        }}
      >
        <button className="text-sm font-medium text-red-300 underline-offset-4 hover:underline" type="submit">
          Șterge
        </button>
      </form>
    </article>
  );
}

function TaxonomyFields({
  item,
  prefix,
  state,
}: {
  item?: TaxonomyRecord;
  prefix: string;
  state: typeof EMPTY_ACTION_STATE;
}) {
  return (
    <>
      <Field error={state.fieldErrors.name} id={`${prefix}-name`} label="Nume">
        <input className={inputClass} defaultValue={item?.name} id={`${prefix}-name`} maxLength={120} name="name" required />
      </Field>
      <Field error={state.fieldErrors.slug} id={`${prefix}-slug`} label="Slug">
        <input className={inputClass} defaultValue={item?.slug} id={`${prefix}-slug`} maxLength={160} name="slug" placeholder="exemplu-slug" required />
      </Field>
      <Field error={state.fieldErrors.description} id={`${prefix}-description`} label="Descriere">
        <textarea className={inputClass} defaultValue={item?.description ?? ""} id={`${prefix}-description`} maxLength={5000} name="description" rows={3} />
      </Field>
    </>
  );
}

function Field({ children, error, id, label }: { children: React.ReactNode; error?: string; id: string; label: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-200" htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="mt-2 text-sm text-red-300" id={`${id}-error`}>{error}</p> : null}
    </div>
  );
}
