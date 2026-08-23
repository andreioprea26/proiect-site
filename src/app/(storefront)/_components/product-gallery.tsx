"use client";

import Image from "next/image";
import { useState } from "react";

type GalleryImage = {
  url: string;
  altText: string | null;
};

export function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-[2rem] bg-gradient-to-br from-amber-100 via-rose-50 to-emerald-50 px-8 text-center font-medium text-stone-500">
        Imagine în pregătire
      </div>
    );
  }

  const activeImage = images[Math.min(activeIndex, images.length - 1)];

  return (
    <div aria-label={`Galerie imagini pentru ${productName}`}>
      <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-stone-100">
        <Image
          alt={activeImage.altText ?? productName}
          className="object-cover"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          src={activeImage.url}
        />
      </div>
      {images.length > 1 ? (
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((image, index) => (
            <button
              aria-label={`Afișează imaginea ${index + 1}`}
              aria-pressed={activeIndex === index}
              className="relative aspect-square overflow-hidden rounded-xl border-2 border-transparent bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 aria-pressed:border-emerald-800"
              key={`${image.url}-${index}`}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <Image
                alt={image.altText ?? `${productName}, imaginea ${index + 1}`}
                className="object-cover"
                fill
                sizes="120px"
                src={image.url}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
