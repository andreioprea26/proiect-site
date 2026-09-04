import type { Metadata } from "next";
import { listContactRequests, type ContactStatus } from "@/lib/admin/engagement";
import { updateContactRequest } from "./actions";

export const metadata: Metadata = { title: "Contact | Admin" };
const labels: Record<ContactStatus, string> = { new: "Nou", in_progress: "În lucru", closed: "Închis" };

export default async function AdminContactPage() {
  const requests = await listContactRequests();
  return <div><p className="text-sm font-medium text-emerald-400">Mesaje</p><h1 className="mt-2 text-3xl font-semibold">Contact</h1><div className="mt-8 grid gap-5">{requests.length ? requests.map((item) => <article className="rounded-2xl border border-stone-800 bg-stone-900 p-6" key={item.id}><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{item.name} · {item.email}</h2><p className="mt-1 text-sm text-emerald-400">{item.category}</p></div><span className="rounded-full bg-stone-800 px-3 py-1 text-xs">{labels[item.status as ContactStatus]}</span></div><p className="mt-4 whitespace-pre-line text-stone-300">{item.message}</p><form action={updateContactRequest} className="mt-5 grid gap-3 border-t border-stone-800 pt-5"><input name="id" type="hidden" value={item.id} /><label className="text-sm">Status<select className="mt-1 block rounded-lg border border-stone-700 bg-stone-950 px-3 py-2" defaultValue={item.status} name="status">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm">Notă internă<textarea className="mt-1 min-h-24 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2" defaultValue={item.internal_note ?? ""} maxLength={4000} name="internalNote" /></label><button className="w-fit rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold" type="submit">Salvează mesajul</button></form></article>) : <p className="rounded-xl border border-dashed border-stone-700 p-6 text-stone-400">Nu există mesaje.</p>}</div></div>;
}
