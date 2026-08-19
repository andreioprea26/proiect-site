import { redirect } from "next/navigation";

import { getAccountContext } from "@/lib/account/server";

import { AddressForm } from "./address-form";
import { deleteAddress } from "./actions";

export default async function AddressesPage() {
  const context = await getAccountContext();
  if (!context) redirect("/login");

  const { data: addresses } = await context.supabase
    .from("customer_addresses")
    .select("id, label, recipient_name, phone, address_line_1, address_line_2, city, county, postal_code, country_code, is_default, updated_at")
    .eq("user_id", context.user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  return (
    <section>
      <p className="text-sm font-medium text-emerald-800">Cont client</p>
      <h1 className="mt-2 text-3xl font-semibold">Adresele mele</h1>
      <p className="mt-3 text-stone-600">Adaugă și actualizează adresele folosite pentru livrare.</p>

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Adresă nouă</h2>
        <AddressForm />
      </section>

      <div className="mt-8 space-y-6">
        {(addresses ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-stone-600">Nu ai adrese salvate.</p>
        ) : null}
        {(addresses ?? []).map((address) => (
          <article className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm" key={address.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{address.label || address.recipient_name}</h2>
              {address.is_default ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">Implicită</span> : null}
            </div>
            <AddressForm
              addressId={address.id}
              key={`${address.id}:${address.updated_at}`}
              initial={{
                label: address.label ?? "",
                recipientName: address.recipient_name,
                phone: address.phone,
                addressLine1: address.address_line_1,
                addressLine2: address.address_line_2 ?? "",
                city: address.city,
                county: address.county,
                postalCode: address.postal_code ?? "",
                countryCode: address.country_code,
                isDefault: address.is_default,
              }}
            />
            <form action={deleteAddress} className="mt-4 border-t border-stone-100 pt-4">
              <input name="addressId" type="hidden" value={address.id} />
              <button className="text-sm font-medium text-red-700" type="submit">Șterge adresa</button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
