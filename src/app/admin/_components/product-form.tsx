"use client";

import { useActionState } from "react";

import { createProduct, updateProduct } from "@/app/admin/catalog-actions";
import {
  AVAILABILITY_STATUS_LABELS,
  AVAILABILITY_STATUSES,
  PRODUCT_TYPE_LABELS,
  PRODUCT_TYPES,
  PUBLICATION_STATUS_LABELS,
  PUBLICATION_STATUSES,
  type ProductRecord,
  type TaxonomyRecord,
} from "@/lib/admin/catalog";
import { EMPTY_ACTION_STATE } from "@/lib/admin/catalog-validation";

import { ActionMessage } from "./action-message";

type ProductFormProps = {
  categories: TaxonomyRecord[];
  collections: TaxonomyRecord[];
  initialCategoryIds?: string[];
  initialCollectionIds?: string[];
  product?: ProductRecord;
};

const inputClass =
  "mt-2 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-950";

export function ProductForm({
  categories,
  collections,
  initialCategoryIds = [],
  initialCollectionIds = [],
  product,
}: ProductFormProps) {
  const action = product ? updateProduct.bind(null, product.id) : createProduct;
  const [state, formAction, isPending] = useActionState(action, EMPTY_ACTION_STATE);

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <section className="grid gap-5 rounded-2xl border border-stone-800 bg-stone-900 p-6 md:grid-cols-2">
        <Input defaultValue={product?.name} error={state.fieldErrors.name} id="product-name" label="Nume" maxLength={180} name="name" required />
        <Input defaultValue={product?.slug} error={state.fieldErrors.slug} id="product-slug" label="Slug" maxLength={200} name="slug" placeholder="exemplu-produs" required />
        <div className="md:col-span-2">
          <label className="block text-sm font-medium" htmlFor="product-description">Descriere</label>
          <textarea className={inputClass} defaultValue={product?.description ?? ""} id="product-description" maxLength={10000} name="description" rows={6} />
          <ErrorText error={state.fieldErrors.description} id="product-description" />
        </div>
        <Input defaultValue={product ? String(product.base_price) : ""} error={state.fieldErrors.basePrice} id="product-price" label="Preț de bază (RON)" min="0" name="basePrice" required step="0.01" type="number" />
        <Input defaultValue={product?.lead_time_days ? String(product.lead_time_days) : ""} error={state.fieldErrors.leadTimeDays} id="product-lead-time" label="Termen de realizare/expediere (zile)" min="1" name="leadTimeDays" step="1" type="number" />
        <Select defaultValue={product?.product_type ?? "standard"} error={state.fieldErrors.productType} id="product-type" label="Tip produs" name="productType" options={PRODUCT_TYPES.map((value) => ({ value, label: PRODUCT_TYPE_LABELS[value] }))} />
        <Select defaultValue={product?.availability_status ?? "unavailable"} error={state.fieldErrors.availabilityStatus} id="product-availability" label="Disponibilitate" name="availabilityStatus" options={AVAILABILITY_STATUSES.map((value) => ({ value, label: AVAILABILITY_STATUS_LABELS[value] }))} />
        <Select defaultValue={product?.publication_status ?? "draft"} error={state.fieldErrors.publicationStatus} id="product-publication" label="Status publicare" name="publicationStatus" options={PUBLICATION_STATUSES.map((value) => ({ value, label: PUBLICATION_STATUS_LABELS[value] }))} />
        <label className="flex items-center gap-3 self-end rounded-lg border border-stone-800 px-4 py-3 text-sm font-medium">
          <input defaultChecked={product?.is_customizable ?? false} name="isCustomizable" type="checkbox" />
          Produs personalizabil
        </label>
      </section>

      <section className="grid gap-6 rounded-2xl border border-stone-800 bg-stone-900 p-6 md:grid-cols-2">
        <CheckboxGroup error={state.fieldErrors.categoryIds} initialIds={initialCategoryIds} items={categories} legend="Categorii" name="categoryIds" />
        <CheckboxGroup error={state.fieldErrors.collectionIds} initialIds={initialCollectionIds} items={collections} legend="Colecții" name="collectionIds" />
      </section>

      <ActionMessage state={state} />
      <div>
        <button className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-60" disabled={isPending} type="submit">
          {isPending ? "Se salvează…" : product ? "Salvează produsul" : "Creează produsul"}
        </button>
      </div>
    </form>
  );
}

function Input({ error, id, label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string; id: string; label: string }) {
  return (
    <div>
      <label className="block text-sm font-medium" htmlFor={id}>{label}</label>
      <input aria-invalid={Boolean(error)} className={inputClass} id={id} {...props} />
      <ErrorText error={error} id={id} />
    </div>
  );
}

function Select({ error, id, label, name, options, defaultValue }: { defaultValue: string; error?: string; id: string; label: string; name: string; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-sm font-medium" htmlFor={id}>{label}</label>
      <select className={inputClass} defaultValue={defaultValue} id={id} name={name}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ErrorText error={error} id={id} />
    </div>
  );
}

function CheckboxGroup({ error, initialIds, items, legend, name }: { error?: string; initialIds: string[]; items: TaxonomyRecord[]; legend: string; name: string }) {
  return (
    <fieldset>
      <legend className="font-semibold">{legend}</legend>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-stone-400">Nu există opțiuni create.</p>
      ) : (
        <div className="mt-3 grid gap-2">
          {items.map((item) => (
            <label className="flex items-center gap-3 rounded-lg border border-stone-800 px-3 py-2 text-sm" key={item.id}>
              <input defaultChecked={initialIds.includes(item.id)} name={name} type="checkbox" value={item.id} />
              {item.name}
            </label>
          ))}
        </div>
      )}
      <ErrorText error={error} id={name} />
    </fieldset>
  );
}

function ErrorText({ error, id }: { error?: string; id: string }) {
  return error ? <p className="mt-2 text-sm text-red-300" id={`${id}-error`}>{error}</p> : null;
}
