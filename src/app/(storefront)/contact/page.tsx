import type { Metadata } from "next";
import { getAccountContext } from "@/lib/account/server";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact", description: "Trimite o întrebare echipei Brand Handmade.", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const context = await getAccountContext();
  let defaultName = "";
  if (context) {
    const { data } = await context.supabase.from("profiles").select("first_name, last_name").eq("id", context.user.id).maybeSingle();
    defaultName = [data?.first_name, data?.last_name].filter(Boolean).join(" ");
  }
  return <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8"><p className="text-sm font-semibold text-emerald-800">Suntem aici să ajutăm</p><h1 className="mt-2 text-4xl font-semibold">Contact</h1><p className="mt-4 text-stone-600">Folosește formularul pentru întrebări despre produse, comenzi sau alte informații. Colectăm doar datele necesare pentru a răspunde.</p><ContactForm defaultEmail={context?.user.email ?? ""} defaultName={defaultName} /></main>;
}
