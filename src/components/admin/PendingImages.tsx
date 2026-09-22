"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageUploader } from "@/components/admin/ImageUploader";

/**
 * Sobe fotos para o Cloudinary ANTES do produto existir (o upload não depende do id do produto).
 * As URLs ficam em campos ocultos e são anexadas ao produto pelo servidor no mesmo envio do formulário.
 */
export function PendingImages() {
  const [urls, setUrls] = useState<string[]>([]);

  return (
    <div>
      {urls.length > 0 && (
        <ul className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {urls.map((url) => (
            <li key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-line">
              <Image src={url} alt="" fill sizes="150px" className="object-cover" />
              <input type="hidden" name="imageUrls" value={url} />
              <button
                type="button"
                onClick={() => setUrls((prev) => prev.filter((u) => u !== url))}
                aria-label="Remover foto"
                className="absolute right-1 top-1 rounded-full bg-ink/80 px-2 py-1 text-xs text-ivory opacity-0 transition group-hover:opacity-100 hover:text-red-300"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
      <ImageUploader onUploaded={(img) => setUrls((prev) => [...prev, img.url])} />
    </div>
  );
}
