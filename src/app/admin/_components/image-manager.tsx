/* eslint-disable @next/next/no-img-element */
"use client";

import { useActionState } from "react";

import { deleteProductImage, moveProductImage, updateProductImage, uploadProductImage } from "@/app/admin/product-detail-actions";
import type { ProductImageRecord } from "@/lib/admin/product-details";
import { EMPTY_DETAIL_STATE } from "@/lib/admin/product-details-validation";

import { ActionMessage } from "./action-message";

const inputClass = "mt-2 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-950";

export function ImageManager({ images, productId }: { images: ProductImageRecord[]; productId: string }) {
  const [state, formAction, pending] = useActionState(uploadProductImage.bind(null, productId), EMPTY_DETAIL_STATE);
  return (
    <section className="rounded-2xl border border-stone-800 bg-stone-900 p-6" id="imagini">
      <h2 className="text-2xl font-semibold">Imagini</h2>
      <p className="mt-2 text-sm text-stone-300">JPEG, PNG, WebP sau AVIF, maximum 5 MiB. Prima imagine din listă este imaginea principală.</p>
      <form action={formAction} className="mt-6 grid gap-4 rounded-xl border border-stone-700 p-4 md:grid-cols-2" noValidate>
        <Field error={state.fieldErrors.image} id="new-product-image" label="Fișier imagine"><input accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif" className={inputClass} id="new-product-image" name="image" required type="file" /></Field>
        <Field error={state.fieldErrors.altText} id="new-image-alt" label="Text alternativ"><input className={inputClass} id="new-image-alt" maxLength={500} name="altText" /></Field>
        <div className="md:col-span-2"><ActionMessage state={state} /></div>
        <div><button className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold disabled:opacity-60" disabled={pending} type="submit">{pending ? "Se încarcă…" : "Încarcă imaginea"}</button></div>
      </form>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {images.map((image, index) => <ImageEditor canMoveDown={index < images.length - 1} canMoveUp={index > 0} image={image} key={image.id} productId={productId} />)}
        {images.length === 0 ? <p className="text-sm text-stone-400">Produsul nu are imagini.</p> : null}
      </div>
    </section>
  );
}

function ImageEditor({ canMoveDown, canMoveUp, image, productId }: { canMoveDown: boolean; canMoveUp: boolean; image: ProductImageRecord; productId: string }) {
  const [editState, editAction, editing] = useActionState(updateProductImage.bind(null, productId, image.id), EMPTY_DETAIL_STATE);
  const [upState, upAction, movingUp] = useActionState(moveProductImage.bind(null, productId, image.id, "up"), EMPTY_DETAIL_STATE);
  const [downState, downAction, movingDown] = useActionState(moveProductImage.bind(null, productId, image.id, "down"), EMPTY_DETAIL_STATE);
  const [deleteState, deleteAction, deleting] = useActionState(deleteProductImage.bind(null, productId, image.id), EMPTY_DETAIL_STATE);
  const operationState = upState.message ? upState : downState.message ? downState : deleteState;

  return (
    <article className="overflow-hidden rounded-xl border border-stone-700">
      <img alt={image.alt_text ?? "Imagine produs fără text alternativ"} className="aspect-square w-full bg-stone-950 object-contain" src={image.public_url} />
      <div className="grid gap-3 p-4">
        <p className="text-xs text-stone-400">Poziția {image.display_order}</p>
        <form action={editAction} className="grid gap-3" noValidate>
          <Field error={editState.fieldErrors.altText} id={`image-${image.id}-alt`} label="Text alternativ"><input className={inputClass} defaultValue={image.alt_text ?? ""} id={`image-${image.id}-alt`} maxLength={500} name="altText" /></Field>
          <ActionMessage state={editState} />
          <div><button className="rounded-lg border border-stone-600 px-3 py-2 text-sm font-semibold disabled:opacity-60" disabled={editing} type="submit">{editing ? "Se salvează…" : "Salvează textul"}</button></div>
        </form>
        <div className="flex flex-wrap gap-2">
          <form action={upAction}><button className="rounded-lg border border-stone-700 px-3 py-2 text-sm disabled:opacity-40" disabled={!canMoveUp || movingUp} type="submit">Mută sus</button></form>
          <form action={downAction}><button className="rounded-lg border border-stone-700 px-3 py-2 text-sm disabled:opacity-40" disabled={!canMoveDown || movingDown} type="submit">Mută jos</button></form>
          <form action={deleteAction} onSubmit={(event) => { if (!window.confirm("Ștergi definitiv această imagine din produs și Storage?")) event.preventDefault(); }}><button className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 disabled:opacity-60" disabled={deleting} type="submit">Șterge</button></form>
        </div>
        <ActionMessage state={operationState} />
      </div>
    </article>
  );
}

function Field({ children, error, id, label }: { children: React.ReactNode; error?: string; id: string; label: string }) {
  return <div><label className="block text-sm font-medium" htmlFor={id}>{label}</label>{children}{error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}</div>;
}
