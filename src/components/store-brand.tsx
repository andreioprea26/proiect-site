"use client";

/** @jsxImportSource react */

import Image from "next/image";
import { useState } from "react";
import { brandAsset } from "../lib/config/theme";

/** A fixed 4:1 slot prevents layout shifts, including on image failure. */
export function StoreBrand({ name, logo }: { name: string; logo: string | null }) {
  const src = brandAsset(logo, "logo");
  const [failed, setFailed] = useState<string | null>(null);
  if (!src) return <span data-store-brand="text">{name}</span>;
  return <span className="inline-flex h-12 w-48 max-w-full items-center" data-store-brand="logo">
    {failed === src ? <span className="line-clamp-2 text-sm">{name}</span> : <Image src={src} alt={name} width={192} height={48} unoptimized className="h-12 w-48 object-contain" onError={() => setFailed(src)} />}
  </span>;
}
