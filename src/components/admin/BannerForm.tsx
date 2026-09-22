"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { saveBannerAction } from "@/app/admin/banners/actions";
import { Field } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormState } from "@/lib/form-state";

export interface BannerDefaults {
  id?: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  position: number;
  active: boolean;
}

export function BannerForm({ defaults }: { defaults: BannerDefaults }) {
  const [state, action] = useActionState<FormState, FormData>(saveBannerAction, {});
  const [imageUrl, setImageUrl] = useState(defaults.imageUrl);
  const fe = state.fieldErrors;

  return (
    <form action={action} className="max-w-lg space-y-5" noValidate>
      <FormAlert state={state} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <Field label="Título (opcional, uso interno)" name="title" required={false} defaultValue={defaults.title} />

      <div>
        <p className="mb-2 text-sm text-ivory/85">Imagem</p>
        {imageUrl && (
          <div className="relative mb-3 h-32 w-full overflow-hidden rounded-xl border border-line">
            <Image src={imageUrl} alt="" fill sizes="512px" className="object-cover" />
          </div>
        )}
        <ImageUploader onUploaded={(img) => setImageUrl(img.url)} />
        <input type="hidden" name="imageUrl" value={imageUrl} />
        {fe?.imageUrl?.[0] && (
          <p role="alert" className="mt-1.5 text-xs text-red-300">
            {fe.imageUrl[0]}
          </p>
        )}
      </div>

      <Field label="Link ao clicar" name="linkUrl" required={false} defaultValue={defaults.linkUrl} placeholder="/perfumes?genero=feminino" />
      <Field label="Posição" name="position" type="number" defaultValue={String(defaults.position)} hint="Menor número aparece primeiro" />
      <label className="flex cursor-pointer items-center gap-3 text-sm text-ivory/85">
        <input type="checkbox" name="active" defaultChecked={defaults.active} className="h-4 w-4 accent-[var(--color-gold)]" />
        Ativo
      </label>
      <SubmitButton pendingLabel="Salvando..." className="sm:w-auto">
        Salvar banner
      </SubmitButton>
    </form>
  );
}
