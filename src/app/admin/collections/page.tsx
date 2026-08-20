import type { Metadata } from "next";

import { TaxonomyManager } from "@/app/admin/_components/taxonomy-manager";
import type { TaxonomyRecord } from "@/lib/admin/catalog";
import { requireAdminContext } from "@/lib/admin/server";

export const metadata: Metadata = { title: "Colecții | Admin" };

export default async function CollectionsPage() {
  const { supabase } = await requireAdminContext();
  const { data, error } = await supabase
    .from("collections")
    .select("id, name, slug, description")
    .order("name");

  if (error) throw new Error("Colecțiile nu au putut fi încărcate.");

  return (
    <div>
      <p className="text-sm font-medium text-emerald-400">Catalog</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Colecții</h1>
      <p className="mt-3 max-w-2xl text-stone-300">
        Creează, modifică sau șterge colecții. Ștergerea elimină și asocierile existente cu produsele.
      </p>
      <div className="mt-8">
        <TaxonomyManager items={(data ?? []) as TaxonomyRecord[]} kind="collection" />
      </div>
    </div>
  );
}
