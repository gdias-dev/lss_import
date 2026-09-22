"use client";

import Image from "next/image";
import { useTransition } from "react";
import { addImageAction, deleteImageAction } from "@/app/admin/produtos/actions";
import { ImageUploader } from "@/components/admin/ImageUploader";

export interface ImageRow {
  id: string;
  url: string;
  alt: string | null;
}

export function ImageManager({ productId, images }: { productId: string; images: ImageRow[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <ul className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((img) => (
          <li key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border border-line">
            <Image src={img.url} alt={img.alt ?? ""} fill sizes="150px" className="object-cover" />
            <form action={deleteImageAction} className="absolute right-1 top-1">
              <input type="hidden" name="id" value={img.id} />
              <input type="hidden" name="productId" value={productId} />
              <button type="submit" aria-label="Remover imagem" className="rounded-full bg-ink/80 px-2 py-1 text-xs text-ivory opacity-0 transition group-hover:opacity-100 hover:text-red-300">
                Remover
              </button>
            </form>
          </li>
        ))}
      </ul>
      <ImageUploader onUploaded={(img) => startTransition(() => addImageAction(productId, img.url))} />
      {pending && <p className="mt-2 text-xs text-muted">Salvando...</p>}
    </div>
  );
}
