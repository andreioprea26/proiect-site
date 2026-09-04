import type { Metadata } from "next";
import { listAdminContentPages } from "@/lib/content/server";
import { saveContentPage } from "./actions";

export const metadata: Metadata = { title: "Conținut | Admin" };

export default async function AdminContentPage() {
  const pages = await listAdminContentPages();
  return <div><p className="text-sm font-medium text-emerald-400">Site</p><h1 className="mt-2 text-3xl font-semibold">Pagini informative</h1><p className="mt-3 text-stone-400">Conținut text simplu, fără HTML arbitrar. Publicul vede numai paginile publicate.</p><div className="mt-8 grid gap-6"><ContentForm />{pages.map((page) => <ContentForm key={page.id} page={page} />)}</div></div>;
}

function ContentForm({ page }: { page?: Awaited<ReturnType<typeof listAdminContentPages>>[number] }) { return <form action={saveContentPage} className="grid gap-4 rounded-2xl border border-stone-800 bg-stone-900 p-6"><input name="id" type="hidden" value={page?.id ?? ""} /><h2 className="font-semibold">{page ? page.title : "Pagină nouă"}</h2><label className="text-sm">Slug<input className="mt-1 block w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2" defaultValue={page?.slug ?? ""} maxLength={100} name="slug" placeholder="despre-noi" required /></label><label className="text-sm">Titlu<input className="mt-1 block w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2" defaultValue={page?.title ?? ""} maxLength={120} name="title" required /></label><label className="text-sm">Conținut<textarea className="mt-1 min-h-40 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2" defaultValue={page?.content ?? ""} maxLength={20000} name="content" required /></label><label className="text-sm">Status<select className="mt-1 block rounded-lg border border-stone-700 bg-stone-950 px-3 py-2" defaultValue={page?.status ?? "draft"} name="status"><option value="draft">Draft</option><option value="published">Publicată</option></select></label><button className="w-fit rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold" type="submit">Salvează pagina</button></form>; }
