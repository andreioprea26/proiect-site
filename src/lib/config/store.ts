import type { Metadata } from "next";

/** Public, serializable identity only. Safe to import from client/error components. */
export type PublicStoreConfig = {
  readonly version: 1;
  readonly name: string;
  readonly tagline: string;
  readonly description: string;
  readonly seoDescription: string;
  readonly footerDescription: string;
  readonly contact: { readonly email: string | null; readonly phone: string | null; readonly whatsapp: string | null };
  readonly social: { readonly instagram: string | null; readonly facebook: string | null; readonly tiktok: string | null };
  readonly market: { readonly locale: "ro-RO"; readonly country: "RO"; readonly currency: "RON"; readonly timeZone: "Europe/Bucharest" };
  readonly assets: { readonly ogImage: `/${string}` | null };
  readonly copy: {
    readonly heroTitle: string;
    readonly productsEyebrow: string;
    readonly promoEyebrow: string;
    readonly promoTitle: string;
    readonly promoDescription: string;
    readonly highlightsTitle: string;
    readonly highlights: readonly string[];
    readonly emptyCart: string;
    readonly emptyProducts: string;
    readonly shopDescription: string;
    readonly categoriesDescription: string;
    readonly collectionsDescription: string;
    readonly customOrdersDescription: string;
  };
};

export const STORE_CONFIG: PublicStoreConfig = {
  version: 1,
  name: "Brand Handmade",
  tagline: "Descoperă magazinul nostru",
  description: "Explorează catalogul și găsește produsele potrivite pentru tine.",
  seoDescription: "Descoperă produsele, categoriile și colecțiile disponibile în magazinul nostru online.",
  footerDescription: "Explorează produsele și colecțiile noastre. Pentru întrebări, folosește pagina de contact.",
  market: { locale: "ro-RO", country: "RO", currency: "RON", timeZone: "Europe/Bucharest" },
  assets: { ogImage: null },
  contact: { email: null, phone: null, whatsapp: null },
  social: { instagram: null, facebook: null, tiktok: null },
  copy: {
    heroTitle: "Descoperă produsele potrivite pentru tine.",
    productsEyebrow: "În magazin",
    promoEyebrow: "Cereri personalizate",
    promoTitle: "Ai o cerere specială?",
    promoDescription: "Trimite detaliile cererii tale pentru a discuta opțiunile disponibile.",
    highlightsTitle: "Explorează magazinul",
    highlights: ["Descoperă categoriile de produse", "Consultă detaliile și opțiunile fiecărui produs", "Contactează-ne pentru întrebări"],
    emptyCart: "Descoperă produsele și alege varianta potrivită.",
    emptyProducts: "Momentan nu există produse de afișat. Revino pentru noutăți.",
    shopDescription: "Explorează produsele publicate în magazin.",
    categoriesDescription: "Explorează produsele după categorie.",
    collectionsDescription: "Explorează selecțiile și colecțiile publicate.",
    customOrdersDescription: "Trimite o cerere și discută opțiunile de personalizare disponibile.",
  },
};

export function storeTitle(title: string, config: PublicStoreConfig = STORE_CONFIG) {
  return `${title} | ${config.name}`;
}

export function storeText(config: PublicStoreConfig = STORE_CONFIG) {
  return {
    loginDescription: `Autentifică-te în contul tău ${config.name}.`,
    registerDescription: `Creează un cont de client pentru magazinul ${config.name}.`,
    contactDescription: `Trimite o întrebare echipei ${config.name}.`,
    titleTemplate: `%s | ${config.name}`,
    defaultTitle: `${config.name} | ${config.tagline}`,
  };
}

/** Origin remains infrastructure-owned; no env or database reads here. */
export function storeMetadata(config: PublicStoreConfig = STORE_CONFIG): Metadata {
  const images = config.assets.ogImage ? [config.assets.ogImage] : undefined;
  return {
    title: config.name,
    description: config.seoDescription,
    applicationName: config.name,
    openGraph: { type: "website", locale: "ro_RO", siteName: config.name, title: config.name, description: config.seoDescription, url: "/", ...(images ? { images } : {}) },
    twitter: { card: "summary", title: config.name, description: config.seoDescription, ...(images ? { images } : {}) },
  };
}
