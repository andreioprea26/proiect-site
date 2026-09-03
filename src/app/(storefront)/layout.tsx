import Link from "next/link";
import { listPublishedContentPages } from "@/lib/content/server";

import { AccountNavigation } from "./_components/account-navigation";
import { CartIndicator } from "./_components/cart-indicator";
import { CartProvider } from "./_components/cart-provider";
import { NewsletterForm } from "./_components/newsletter-form";

export default async function StorefrontLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const informationPages = await listPublishedContentPages();
  return (
    <CartProvider>
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
            <Link className="hover:text-emerald-900" href="/custom-orders">
              Cereri personalizate
            </Link>
            <Link className="hover:text-emerald-900" href="/contact">
              Contact
            </Link>
          </nav>
          <div className="order-2 flex items-center gap-2 md:order-3">
            <CartIndicator />
            <AccountNavigation />
          </div>
        </div>
      </header>
      {children}
      <footer className="mt-20 border-t border-stone-200 bg-emerald-950 text-emerald-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-2 lg:grid-cols-4">
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
              <Link href="/custom-orders">Cereri personalizate</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </nav>
          <div className="text-sm"><p className="font-semibold">Informații</p><div className="mt-3 flex flex-col items-start gap-2 text-emerald-100/80">{informationPages.length ? informationPages.slice(0, 6).map((page) => <Link href={`/info/${page.slug}`} key={page.id}>{page.title}</Link>) : <span>Conținutul va fi publicat în curând.</span>}</div></div>
          <div>
            <NewsletterForm />
          </div>
        </div>
      </footer>
      </div>
    </CartProvider>
  );
}
