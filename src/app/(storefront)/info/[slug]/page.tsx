import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedContentPage } from "@/lib/content/server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = await getPublishedContentPage((await params).slug);
  return page
    ? {
        title: page.title,
        description: page.content.replace(/\s+/g, " ").trim().slice(0, 160),
        alternates: { canonical: `/info/${page.slug}` },
      }
    : { title: "Pagină indisponibilă", robots: { index: false, follow: false } };
}

export default async function InformationPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = await getPublishedContentPage((await params).slug);
  if (!page) notFound();
  return <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8"><p className="text-sm font-semibold text-emerald-800">Informații</p><h1 className="mt-2 text-4xl font-semibold">{page.title}</h1><div className="mt-8 whitespace-pre-line rounded-2xl border border-stone-200 bg-white p-6 leading-8 text-stone-700 shadow-sm">{page.content}</div></main>;
}
