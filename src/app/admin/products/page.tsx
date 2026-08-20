import type { Metadata } from "next";
import Link from "next/link";

import {
  AVAILABILITY_STATUS_LABELS,
  PRODUCT_TYPE_LABELS,
  PUBLICATION_STATUS_LABELS,
  type ProductRecord,
} from "@/lib/admin/catalog";
import { requireAdminContext } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Produse | Admin" };

const currency = new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" });

export default async function ProductsPage() {
  const { supabase } = await requireAdminContext();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, description, base_price, product_type, publication_status, availability_status, is_customizable, lead_time_days, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw new Error("Produsele nu au putut fi încărcate.");
  const products = (data ?? []) as ProductRecord[];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-400">Catalog</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Produse</h1>
        </div>
        <Link className="rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white" href="/admin/products/new">
          Produs nou
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-stone-700 p-6 text-stone-400">
          Nu există încă produse.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-stone-800">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-stone-900 text-stone-300">
              <tr>
                <th className="px-4 py-3 font-medium">Nume</th>
                <th className="px-4 py-3 font-medium">Tip</th>
                <th className="px-4 py-3 font-medium">Publicare</th>
                <th className="px-4 py-3 font-medium">Disponibilitate</th>
                <th className="px-4 py-3 font-medium">Preț</th>
                <th className="px-4 py-3 font-medium"><span className="sr-only">Acțiuni</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {products.map((product) => (
                <tr className="bg-stone-950" key={product.id}>
                  <td className="px-4 py-4 font-medium">{product.name}</td>
                  <td className="px-4 py-4 text-stone-300">{PRODUCT_TYPE_LABELS[product.product_type]}</td>
                  <td className="px-4 py-4 text-stone-300">{PUBLICATION_STATUS_LABELS[product.publication_status]}</td>
                  <td className="px-4 py-4 text-stone-300">{AVAILABILITY_STATUS_LABELS[product.availability_status]}</td>
                  <td className="px-4 py-4 text-stone-300">{currency.format(Number(product.base_price))}</td>
                  <td className="px-4 py-4 text-right">
                    <Link className="font-semibold text-emerald-400 underline-offset-4 hover:underline" href={`/admin/products/${product.id}`}>
                      Editează
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
