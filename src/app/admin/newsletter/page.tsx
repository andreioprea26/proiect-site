import type { Metadata } from "next";
import { listNewsletterSubscribers } from "@/lib/admin/engagement";
import { setNewsletterStatus } from "./actions";

export const metadata: Metadata = { title: "Newsletter | Admin" };
const date = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest" });

export default async function AdminNewsletterPage() {
  const subscribers = await listNewsletterSubscribers();
  return <div><p className="text-sm font-medium text-emerald-400">Comunicare</p><h1 className="mt-2 text-3xl font-semibold">Newsletter</h1><p className="mt-3 text-stone-400">Registrul consimțămintelor. Nu trimite campanii.</p><div className="mt-8 grid gap-4">{subscribers.length ? subscribers.map((item) => <article className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-800 bg-stone-900 p-5" key={item.id}><div><h2 className="font-semibold">{item.email}</h2><p className="mt-1 text-sm text-stone-400">{item.is_active ? "Activ" : "Inactiv"} · {item.source} · {date.format(new Date(item.consented_at))}</p></div><form action={setNewsletterStatus}><input name="id" type="hidden" value={item.id} /><input name="active" type="hidden" value={item.is_active ? "false" : "true"} /><button className="rounded-lg border border-stone-600 px-4 py-2 text-sm font-semibold" type="submit">{item.is_active ? "Dezactivează" : "Reactivează"}</button></form></article>) : <p className="rounded-xl border border-dashed border-stone-700 p-6 text-stone-400">Nu există abonări.</p>}</div></div>;
}
