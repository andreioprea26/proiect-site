import { getPublicStoreSettings } from "@/lib/store-settings/server";
import { storeTitle } from "@/lib/config/store";
import { StoreBrand } from "@/components/store-brand";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth/user";
import { PRIVATE_ROBOTS } from "@/lib/seo";

import { logout } from "../login/actions";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getPublicStoreSettings();
  return {
    title: storeTitle("Contul meu", store),
    description: "Zona contului de client.",
    robots: PRIVATE_ROBOTS,
  };
}

export default async function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const store = await getPublicStoreSettings();
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-brand-background text-brand-text">
      <header className="border-b border-brand-border/25 bg-brand-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link className="font-semibold text-brand" href="/">
            <StoreBrand name={store.name} logo={store.assets.logo} />
          </Link>
          <nav aria-label="Navigare cont" className="site-navigation flex flex-wrap items-center gap-4 text-sm">
            <Link href="/account">Cont</Link>
            <Link href="/account/profile">Profil</Link>
            <Link href="/account/addresses">Adrese</Link>
            <Link href="/account/orders">Comenzi</Link>
            <Link href="/account/favorites">Favorite</Link>
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
