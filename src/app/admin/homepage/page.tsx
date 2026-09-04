import type { Metadata } from "next";
import Link from "next/link";

import { getAdminHomepageBlocks } from "@/lib/homepage/server";

import { HomepageBlockForm } from "./homepage-block-form";

export const metadata: Metadata = { title: "Homepage | Admin" };

export default async function AdminHomepagePage() {
  const blocks = await getAdminHomepageBlocks();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-emerald-400">Site</p>
          <h1 className="mt-2 text-3xl font-semibold">Homepage</h1>
          <p className="mt-3 text-sm leading-6 text-stone-400">
            Editează sloturile controlate ale homepage-ului. Conținutul este text simplu, iar CTA-urile acceptă numai destinații interne.
          </p>
        </div>
        <Link className="text-sm font-semibold text-emerald-400 hover:underline" href="/">Vezi storefront-ul →</Link>
      </div>
      <div className="mt-8 grid gap-6">
        {blocks.map((block) => <HomepageBlockForm block={block} key={block.slot} />)}
      </div>
    </div>
  );
}
