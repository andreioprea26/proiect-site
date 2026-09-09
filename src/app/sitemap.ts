import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

type SitemapRow = { slug: string; updated_at: string };

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
  { url: absoluteUrl("/shop"), changeFrequency: "daily", priority: 0.9 },
  { url: absoluteUrl("/categories"), changeFrequency: "weekly", priority: 0.7 },
  { url: absoluteUrl("/collections"), changeFrequency: "weekly", priority: 0.7 },
  { url: absoluteUrl("/custom-orders"), changeFrequency: "monthly", priority: 0.5 },
  { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const [products, categories, collections, contentPages] = await Promise.all([
    supabase
      .from("products")
      .select("slug, updated_at")
      .eq("publication_status", "published"),
    supabase.from("categories").select("slug, updated_at"),
    supabase.from("collections").select("slug, updated_at"),
    supabase
      .from("content_pages")
      .select("slug, updated_at")
      .eq("status", "published"),
  ]);

  if (products.error || categories.error || collections.error || contentPages.error) {
    throw new Error("Sitemap-ul public nu a putut fi generat.");
  }

  return [
    ...STATIC_ROUTES,
    ...rowsToEntries(products.data, "/products", "weekly", 0.8),
    ...rowsToEntries(categories.data, "/categories", "weekly", 0.6),
    ...rowsToEntries(collections.data, "/collections", "weekly", 0.6),
    ...rowsToEntries(contentPages.data, "/info", "monthly", 0.4),
  ];
}

function rowsToEntries(
  rows: SitemapRow[] | null,
  prefix: string,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
): MetadataRoute.Sitemap {
  return (rows ?? []).map((row) => ({
    url: absoluteUrl(`${prefix}/${row.slug}`),
    lastModified: new Date(row.updated_at),
    changeFrequency,
    priority,
  }));
}
