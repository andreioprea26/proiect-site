import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account",
        "/admin",
        "/api",
        "/auth",
        "/cart",
        "/checkout",
        "/forgot-password",
        "/login",
        "/order-confirmation",
        "/register",
        "/reset-password",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
