import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth/user";

import { logout } from "../login/actions";

export const metadata: Metadata = {
  title: "Contul meu | Brand Handmade",
  description: "Zona contului de client.",
};

export default async function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-amber-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link className="font-semibold text-emerald-800" href="/">
            Brand Handmade
          </Link>
          <nav aria-label="Navigare cont" className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/account">Cont</Link>
            <Link href="/account/profile">Profil</Link>
            <Link href="/account/addresses">Adrese</Link>
            <form action={logout}>
              <button className="font-medium text-red-700" type="submit">
                Deconectare
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
