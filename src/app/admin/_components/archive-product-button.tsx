"use client";

import { archiveProduct } from "@/app/admin/catalog-actions";

export function ArchiveProductButton({ productId }: { productId: string }) {
  return (
    <form
      action={archiveProduct.bind(null, productId)}
      onSubmit={(event) => {
        if (!window.confirm("Arhivezi produsul? Acesta va deveni și indisponibil.")) {
          event.preventDefault();
        }
      }}
    >
      <button className="rounded-lg border border-red-800 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-950" type="submit">
        Arhivează produsul
      </button>
    </form>
  );
}
