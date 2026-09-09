import type { Metadata } from "next";
import { getAccountContext } from "@/lib/account/server";
import { CustomRequestForm } from "./custom-request-form";

export const metadata: Metadata = { title: "Comenzi personalizate", description: "Trimite o cerere pentru o creație handmade specială.", alternates: { canonical: "/custom-orders" } };

export default async function CustomOrdersPage() {
  const context = await getAccountContext();
  let defaultName = "";
  if (context) {
    const { data } = await context.supabase.from("profiles").select("first_name, last_name").eq("id", context.user.id).maybeSingle();
    defaultName = [data?.first_name, data?.last_name].filter(Boolean).join(" ");
  }
  return <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8"><p className="text-sm font-semibold text-emerald-800">O idee aparte</p><h1 className="mt-2 text-4xl font-semibold">Cerere personalizată</h1><p className="mt-4 text-stone-600">Spune-ne ce ți-ai dori, iar cererea va fi analizată manual. Trimiterea formularului nu creează automat o comandă, rezervare sau plată.</p><CustomRequestForm defaultEmail={context?.user.email ?? ""} defaultName={defaultName} /></main>;
}
