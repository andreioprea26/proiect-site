import Link from "next/link";

import { AccountNavigation } from "./_components/account-navigation";

export default function StorefrontLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#fbfaf6] text-stone-900">
      <header className="border-b border-stone-200/80 bg-white/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            className="text-lg font-semibold tracking-tight text-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-800"
            href="/"
          >
            Brand Handmade
          </Link>
          <nav
            aria-label="Navigare principală"
            className="order-3 flex w-full flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-700 md:order-2 md:w-auto"
          >
            <Link className="hover:text-emerald-900" href="/">
              Acasă
            </Link>
            <Link className="hover:text-emerald-900" href="/shop">
              Magazin
            </Link>
            <Link className="hover:text-emerald-900" href="/categories">
              Categorii
            </Link>
            <Link className="hover:text-emerald-900" href="/collections">
              Colecții
            </Link>
          </nav>
          <div className="order-2 md:order-3">
            <AccountNavigation />
          </div>
        </div>
      </header>
      {children}
      <footer className="mt-20 border-t border-stone-200 bg-emerald-950 text-emerald-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-3">
          <div>
            <p className="font-semibold">Brand Handmade</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-emerald-100/80">
              Produse lucrate cu grijă, în serii mici, pentru daruri și momente
              cu sens.
            </p>
          </div>
          <nav aria-label="Navigare footer magazin" className="text-sm">
            <p className="font-semibold">Descoperă</p>
            <div className="mt-3 flex flex-col items-start gap-2 text-emerald-100/80">
              <Link href="/shop">Magazin</Link>
              <Link href="/categories">Categorii</Link>
              <Link href="/collections">Colecții</Link>
            </div>
          </nav>
          <div className="text-sm">
            <p className="font-semibold">Cumpărături cu încredere</p>
            <p className="mt-3 leading-6 text-emerald-100/80">
              Produse handmade · Livrare în România
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
