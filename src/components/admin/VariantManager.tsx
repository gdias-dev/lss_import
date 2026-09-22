"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteVariantAction, saveVariantAction } from "@/app/admin/produtos/actions";
import { Field } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatBRL } from "@/lib/money";
import type { FormState } from "@/lib/form-state";

export interface VariantRow {
  id: string;
  sku: string;
  label: string;
  sizeMl: number;
  priceCents: number;
  compareAtCents: number | null;
  stockQty: number;
  weightGrams: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
  active: boolean;
}

const EMPTY: Omit<VariantRow, "id" | "sku"> = { label: "", sizeMl: 100, priceCents: 0, compareAtCents: null, stockQty: 0, weightGrams: 500, heightCm: 16, widthCm: 10, lengthCm: 10, active: true };

function VariantForm({ productId, defaults, onDone }: { productId: string; defaults: VariantRow | (Omit<VariantRow, "id" | "sku"> & { id?: undefined }); onDone?: () => void }) {
  const [state, action] = useActionState<FormState, FormData>(saveVariantAction, {});

  useEffect(() => {
    if (state.ok) onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const fe = state.fieldErrors;

  return (
    <form action={action} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-6" noValidate>
      <input type="hidden" name="productId" value={productId} />
      {"id" in defaults && defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <div className="sm:col-span-6">
        <FormAlert state={state} />
      </div>
      <Field label="Rótulo" name="label" defaultValue={defaults.label} errors={fe?.label} className="sm:col-span-2" />
      <Field label="Tamanho (ml)" name="sizeMl" type="number" defaultValue={String(defaults.sizeMl)} errors={fe?.sizeMl} />
      <Field label="Preço (R$)" name="priceCents" type="number" inputMode="decimal" defaultValue={String(defaults.priceCents / 100)} errors={fe?.priceCents} />
      <Field label={'Preço "de" (R$)'} name="compareAtCents" type="number" inputMode="decimal" required={false} defaultValue={defaults.compareAtCents !== null ? String(defaults.compareAtCents / 100) : ""} />
      <Field label="Estoque" name="stockQty" type="number" defaultValue={String(defaults.stockQty)} errors={fe?.stockQty} />
      <Field label="Peso (g)" name="weightGrams" type="number" defaultValue={String(defaults.weightGrams)} errors={fe?.weightGrams} />
      <Field label="Altura (cm)" name="heightCm" type="number" defaultValue={String(defaults.heightCm)} />
      <Field label="Largura (cm)" name="widthCm" type="number" defaultValue={String(defaults.widthCm)} />
      <Field label="Comprimento (cm)" name="lengthCm" type="number" defaultValue={String(defaults.lengthCm)} />
      <label className="flex items-center gap-2 self-end pb-2 text-sm text-ivory/85">
        <input type="checkbox" name="active" defaultChecked={defaults.active} className="h-4 w-4 accent-[var(--color-gold)]" />
        Ativa
      </label>
      <div className="sm:col-span-6">
        <SubmitButton pendingLabel="Salvando..." className="sm:w-auto">
          Salvar variação
        </SubmitButton>
      </div>
    </form>
  );
}

export function VariantManager({ productId, variants }: { productId: string; variants: VariantRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      {variants.map((v) =>
        editingId === v.id ? (
          <VariantForm key={v.id} productId={productId} defaults={v} onDone={() => setEditingId(null)} />
        ) : (
          <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
            <div>
              <p className="text-ivory">
                {v.label} · {v.sku}
              </p>
              <p className="text-muted">
                {formatBRL(v.priceCents)}
                {v.compareAtCents && ` (de ${formatBRL(v.compareAtCents)})`} · estoque {v.stockQty} · {v.weightGrams}g · {!v.active && "inativa"}
              </p>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setEditingId(v.id)} className="text-gold transition hover:text-gold-soft">
                Editar
              </button>
              <form action={deleteVariantAction}>
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="productId" value={productId} />
                <button type="submit" onClick={(e) => confirm("Remover esta variação?") || e.preventDefault()} className="text-muted transition hover:text-red-300">
                  Remover
                </button>
              </form>
            </div>
          </div>
        ),
      )}

      {adding ? (
        <VariantForm productId={productId} defaults={EMPTY} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="btn-outline">
          + Adicionar tamanho
        </button>
      )}
    </div>
  );
}
