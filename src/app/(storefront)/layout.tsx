import { getPublicStoreSettings } from "@/lib/store-settings/server";
import { StorePublicContact } from "@/components/store-public-contact";
import { StoreBrand } from "@/components/store-brand";
import { storeText } from "@/lib/config/store";
import Link from "next/link";
import type { Metadata } from "next";
import { listPublishedContentPages } from "@/lib/content/server";

import { AccountNavigation } from "./_components/account-navigation";
import { CartIndicator } from "./_components/cart-indicator";
import { CartProvider } from "./_components/cart-provider";
import { NewsletterForm } from "./_components/newsletter-form";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getPublicStoreSettings();
  return {
    title: {
      default: storeText(store).defaultTitle,
      template: storeText(store).titleTemplate,
    },
  };
}

export default async function StorefrontLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const store = await getPublicStoreSettings();
  const informationPages = await listPublishedContentPages();
  return (
    <CartProvider>
      <div className="min-h-screen bg-brand-background text-brand-text">
      <header className="border-b border-brand-border/25 bg-brand-surface/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            className="text-lg font-semibold tracking-tight text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-focus"
            href="/"
          >
            <StoreBrand name={store.name} logo={store.assets.logo} />
          </Link>
          <nav
            aria-label="Navigare principală"
            className="site-navigation order-3 flex w-full flex-wrap items-center gap-x-5 text-sm text-brand-muted md:order-2 md:w-auto"
          >
            <Link className="hover:text-brand" href="/">
              Acasă
            </Link>
            <Link className="hover:text-brand" href="/shop">
              Magazin
            </Link>
            <Link className="hover:text-brand" href="/categories">
              Categorii
            </Link>
            <Link className="hover:text-brand" href="/collections">
              Colecții
            </Link>
            <Link className="hover:text-brand" href="/custom-orders">
              Cereri personalizate
            </Link>
            <Link className="hover:text-brand" href="/contact">
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
      <footer className="brand-inverse mt-20 border-t border-brand-border/25 bg-brand-strong text-brand-on-strong">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-semibold">{store.name}</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-brand-on-strong">
              {store.footerDescription}
            </p>
            <StorePublicContact store={store} />
          </div>
          <nav aria-label="Navigare footer magazin" className="site-navigation text-sm">
            <p className="font-semibold">Descoperă</p>
            <div className="mt-3 flex flex-col items-start gap-2 text-brand-on-strong">
              <Link href="/shop">Magazin</Link>
              <Link href="/categories">Categorii</Link>
              <Link href="/collections">Colecții</Link>
              <Link href="/custom-orders">Cereri personalizate</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </nav>
          <div className="text-sm"><p className="font-semibold">Informații</p><div className="mt-3 flex flex-col items-start gap-2 text-brand-on-strong">{informationPages.length ? informationPages.slice(0, 6).map((page) => <Link href={`/info/${page.slug}`} key={page.id}>{page.title}</Link>) : <span>Conținutul va fi publicat în curând.</span>}</div></div>
          <div>
            <NewsletterForm />
          </div>
        </div>
      </footer>
      </div>
    </CartProvider>
  );
}
