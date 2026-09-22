"use client";

import { useActionState } from "react";
import { saveDeliveryZoneAction } from "@/app/admin/entrega/actions";
import { Field } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormState } from "@/lib/form-state";

export interface ZoneDefaults {
  id?: string;
  name: string;
  feeCents: number;
  freeAboveCents: number | null;
  neighborhoods: string;
  cepRanges: string;
  allowsPayOnDelivery: boolean;
  estimatedDays: number | null;
  active: boolean;
}

export function DeliveryZoneForm({ defaults }: { defaults: ZoneDefaults }) {
  const [state, action] = useActionState<FormState, FormData>(saveDeliveryZoneAction, {});
  const fe = state.fieldErrors;

  return (
    <form action={action} className="max-w-lg space-y-5" noValidate>
      <FormAlert state={state} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <Field label="Nome da zona" name="name" defaultValue={defaults.name} errors={fe?.name} placeholder="Ex.: Centro do Rio" />
      <Field label="Taxa de entrega (R$)" name="feeCents" type="number" inputMode="decimal" defaultValue={String(defaults.feeCents / 100)} errors={fe?.feeCents} />
      <Field label="Frete grátis a partir de (R$)" name="freeAboveCents" type="number" inputMode="decimal" required={false} defaultValue={defaults.freeAboveCents !== null ? String(defaults.freeAboveCents / 100) : ""} hint="Vazio = sem frete grátis nesta zona" />
      <Field label="Bairros atendidos" name="neighborhoods" required={false} defaultValue={defaults.neighborhoods} hint="Separe por vírgula, ex.: Centro, Glória, Lapa" />
      <Field label="Faixas de CEP" name="cepRanges" required={false} defaultValue={defaults.cepRanges} hint="Separe o início e o fim com a palavra 'a'; várias faixas, por vírgula. Ex.: 20000-000 a 20099-999, 20200-000 a 20299-999" />
      <Field label="Prazo estimado (dias)" name="estimatedDays" type="number" inputMode="numeric" required={false} defaultValue={defaults.estimatedDays ? String(defaults.estimatedDays) : ""} />
      <label className="flex cursor-pointer items-center gap-3 text-sm text-ivory/85">
        <input type="checkbox" name="allowsPayOnDelivery" defaultChecked={defaults.allowsPayOnDelivery} className="h-4 w-4 accent-[var(--color-gold)]" />
        Permitir pagamento na entrega nesta zona
      </label>
      <label className="flex cursor-pointer items-center gap-3 text-sm text-ivory/85">
        <input type="checkbox" name="active" defaultChecked={defaults.active} className="h-4 w-4 accent-[var(--color-gold)]" />
        Ativa
      </label>
      <SubmitButton pendingLabel="Salvando..." className="sm:w-auto">
        Salvar zona
      </SubmitButton>
    </form>
  );
}
