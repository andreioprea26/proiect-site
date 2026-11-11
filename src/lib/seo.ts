import "server-only";

import type { Metadata } from "next";

import { getAppUrl } from "@/lib/config/env";

export const SITE_NAME = "Brand Handmade";
export const SITE_DESCRIPTION =
  "Produse handmade, unicate și creații realizate la comandă, cu livrare în România.";

export const PRIVATE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

export function getSiteUrl() {
  const configuredUrl = process.env.APP_URL?.trim();
  const vercelHostname =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  const url = new URL(
    configuredUrl || (vercelHostname ? `https://${vercelHostname}` : getAppUrl()),
  );
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

export function absoluteUrl(pathname: string) {
  return new URL(pathname, getSiteUrl()).toString();
}
