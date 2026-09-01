import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { isCurrentUserAdmin } from "@/lib/auth/authorization";
import { getAuthenticatedUser } from "@/lib/auth/user";

export const metadata: Metadata = {
  title: "Admin | Brand Handmade",
  description: "Zonă administrativă protejată.",
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (!(await isCurrentUserAdmin())) redirect("/");

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-stone-800 bg-stone-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link className="font-semibold text-emerald-400" href="/admin">Brand Handmade — Admin</Link>
          <nav aria-label="Navigare administrare" className="flex flex-wrap items-center gap-4 text-sm text-stone-300">
            <Link href="/admin/orders">Comenzi</Link>
            <Link href="/admin/products">Produse</Link>
            <Link href="/admin/categories">Categorii</Link>
            <Link href="/admin/collections">Colecții</Link>
            <Link href="/">Magazin</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
