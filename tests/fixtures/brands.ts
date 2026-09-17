import { STORE_CONFIG, type PublicStoreConfig } from "../../src/lib/config/store.ts";

/** Fictitious identities, consumed only by tests. Never written to Development. */
export const TEST_BRANDS: readonly PublicStoreConfig[] = [
  { ...STORE_CONFIG, name: "Bijuterii Iris", tagline: "Detalii prețioase", description: "Bijuterii fictive pentru demonstrarea template-ului.", seoDescription: "Colecții demo de bijuterii Iris", footerDescription: "Atelier fictiv de bijuterii", theme: "plum", assets: { logo: "/branding/iris.svg", icon: "/branding/iris-icon.svg", ogImage: "/branding/iris-og.png" }, copy: { ...STORE_CONFIG.copy, heroTitle: "Bijuterii pentru momentele tale", highlightsTitle: "Atelier Iris" } },
  { ...STORE_CONFIG, name: "Lumânări Soare", tagline: "Lumină pentru acasă", description: "Lumânări fictive pentru demonstrarea template-ului.", seoDescription: "Colecții demo de lumânări Soare", footerDescription: "Atelier fictiv de lumânări", theme: "terracotta", assets: { logo: null, icon: "/branding/soare-icon.svg", ogImage: "/branding/soare-og.png" }, copy: { ...STORE_CONFIG.copy, heroTitle: "Lumină și atmosferă acasă", highlightsTitle: "Atelier Soare" } },
];
