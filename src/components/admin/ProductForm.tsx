"use client";

import { useActionState, useState } from "react";
import { saveProductAction } from "@/app/admin/produtos/actions";
import { Field, inputClass } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { PendingImages } from "@/components/admin/PendingImages";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormState } from "@/lib/form-state";

export interface ProductDefaults {
  id?: string;
  name: string;
  brandId: string;
  gender: "FEMININO" | "MASCULINO" | "UNISSEX";
  concentration: "EXTRAIT" | "PARFUM" | "EDP" | "EDT" | "COLOGNE" | "OUTRO";
  olfactoryFamily: string;
  description: string;
  notesTop: string;
  notesHeart: string;
  notesBase: string;
  longevity: string;
  projection: string;
  occasion: string;
  featured: boolean;
  active: boolean;
}

export function ProductForm({ defaults, brands }: { defaults: ProductDefaults; brands: { id: string; name: string }[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveProductAction, {});
  const [brandId, setBrandId] = useState(defaults.brandId || "__new__");
  const fe = state.fieldErrors;

  return (
    <form action={action} className="max-w-2xl space-y-5" noValidate>
      <FormAlert state={state} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <Field label="Nome do perfume" name="name" defaultValue={defaults.name} errors={fe?.name} />

      <div>
        <label htmlFor="marca" className="mb-2 block text-sm text-ivory/85">
          Marca
        </label>
        <select id="marca" name="brandId" value={brandId} onChange={(e) => setBrandId(e.target.value)} className={inputClass}>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
          <option value="__new__">+ Nova marca...</option>
        </select>
        {fe?.brandId?.[0] && (
          <p role="alert" className="mt-1.5 text-xs text-red-300">
            {fe.brandId[0]}
          </p>
        )}
      </div>
      {brandId === "__new__" && <Field label="Nome da nova marca" name="newBrandName" errors={fe?.newBrandName} />}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="genero" className="mb-2 block text-sm text-ivory/85">
            Gênero
          </label>
          <select id="genero" name="gender" defaultValue={defaults.gender} className={inputClass}>
            <option value="FEMININO">Feminino</option>
            <option value="MASCULINO">Masculino</option>
            <option value="UNISSEX">Unissex</option>
          </select>
        </div>
        <div>
          <label htmlFor="concentracao" className="mb-2 block text-sm text-ivory/85">
            Concentração
          </label>
          <select id="concentracao" name="concentration" defaultValue={defaults.concentration} className={inputClass}>
            <option value="EXTRAIT">Extrait</option>
            <option value="PARFUM">Parfum</option>
            <option value="EDP">Eau de Parfum</option>
            <option value="EDT">Eau de Toilette</option>
            <option value="COLOGNE">Colônia</option>
            <option value="OUTRO">Outro</option>
          </select>
        </div>
      </div>

      <Field label="Família olfativa" name="olfactoryFamily" required={false} defaultValue={defaults.olfactoryFamily} placeholder="Ex.: Amadeirado aromático" />
      <div>
        <label htmlFor="descricao" className="mb-2 block text-sm text-ivory/85">
          Descrição
        </label>
        <textarea id="descricao" name="description" defaultValue={defaults.description} rows={4} className={inputClass} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Notas de topo" name="notesTop" required={false} defaultValue={defaults.notesTop} />
        <Field label="Notas de coração" name="notesHeart" required={false} defaultValue={defaults.notesHeart} />
        <Field label="Notas de fundo" name="notesBase" required={false} defaultValue={defaults.notesBase} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Fixação" name="longevity" required={false} defaultValue={defaults.longevity} placeholder="Ex.: 6 a 8 horas" />
        <Field label="Projeção" name="projection" required={false} defaultValue={defaults.projection} placeholder="Ex.: Moderada" />
        <Field label="Ocasião" name="occasion" required={false} defaultValue={defaults.occasion} placeholder="Ex.: Noite" />
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-sm text-ivory/85">
        <input type="checkbox" name="featured" defaultChecked={defaults.featured} className="h-4 w-4 accent-[var(--color-gold)]" />
        Destaque na home
      </label>
      <label className="flex cursor-pointer items-center gap-3 text-sm text-ivory/85">
        <input type="checkbox" name="active" defaultChecked={defaults.active} className="h-4 w-4 accent-[var(--color-gold)]" />
        Ativo (visível na loja)
      </label>

      {!defaults.id && (
        <div>
          <p className="mb-2 text-sm text-ivory/85">Fotos (opcional agora, dá para adicionar depois também)</p>
          <PendingImages />
        </div>
      )}

      <SubmitButton pendingLabel="Salvando..." className="sm:w-auto">
        {defaults.id ? "Salvar alterações" : "Criar produto"}
      </SubmitButton>
    </form>
  );
}
