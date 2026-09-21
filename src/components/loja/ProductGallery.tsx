"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name, initial }: { images: { url: string; alt: string | null }[]; name: string; initial: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index];

  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-surface">
        {current ? (
          <Image src={current.url} alt={current.alt ?? name} fill priority={index === 0} sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(201,164,92,0.16),transparent_70%)]">
            <span aria-hidden className="font-serif text-8xl text-gold/60">{initial}</span>
          </div>
        )}
      </div>
      {images.length > 1 && (
        <ul className="mt-4 grid grid-cols-5 gap-3">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ver imagem ${i + 1} de ${images.length}`}
                aria-current={i === index}
                className={cn("relative block aspect-square w-full overflow-hidden rounded-lg border transition", i === index ? "border-gold" : "border-line opacity-70 hover:opacity-100")}
              >
                <Image src={img.url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
