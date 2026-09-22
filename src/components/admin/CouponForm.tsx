"use client";

import { useActionState, useState } from "react";
import { saveCouponAction } from "@/app/admin/cupons/actions";
import { Field, inputClass } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormState } from "@/lib/form-state";

export interface CouponDefaults {
  id?: string;
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minSubtotalCents: number;
  maxUses: number | null;
  perUserLimit: number | null;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

export function CouponForm({ defaults }: { defaults: CouponDefaults }) {
  const [state, action] = useActionState<FormState, FormData>(saveCouponAction, {});
  const [type, setType] = useState(defaults.type);
  const fe = state.fieldErrors;

  return (
    <form action={action} className="max-w-lg space-y-5" noValidate>
      <FormAlert state={state} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <Field label="Código" name="code" defaultValue={defaults.code} errors={fe?.code} className="uppercase" hint="Como o cliente vai digitar no carrinho" />

      <div>
        <label htmlFor="tipo" className="mb-2 block text-sm text-ivory/85">
          Tipo de desconto
        </label>
        <select id="tipo" name="type" value={type} onChange={(e) => setType(e.target.value as CouponDefaults["type"])} className={inputClass}>
          <option value="PERCENT">Percentual</option>
          <option value="FIXED">Valor fixo (R$)</option>
          <option value="FREE_SHIPPING">Frete grátis</option>
        </select>
      </div>

      {type !== "FREE_SHIPPING" && (
        <Field label={type === "PERCENT" ? "Percentual de desconto (%)" : "Valor do desconto (R$)"} name="value" type="number" inputMode="decimal" defaultValue={type === "FIXED" ? String(defaults.value / 100) : String(defaults.value)} errors={fe?.value} />
      )}
      {type === "FREE_SHIPPING" && <input type="hidden" name="value" value="0" />}

      <Field label="Valor mínimo da compra (R$)" name="minSubtotalCents" type="number" inputMode="decimal" defaultValue={String(defaults.minSubtotalCents / 100)} errors={fe?.minSubtotalCents} required={false} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Limite total de usos" name="maxUses" type="number" inputMode="numeric" required={false} defaultValue={defaults.maxUses ? String(defaults.maxUses) : ""} hint="Vazio = sem limite" />
        <Field label="Limite por cliente" name="perUserLimit" type="number" inputMode="numeric" required={false} defaultValue={defaults.perUserLimit ? String(defaults.perUserLimit) : ""} hint="Vazio = sem limite" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Início" name="startsAt" type="datetime-local" required={false} defaultValue={defaults.startsAt} />
        <Field label="Fim" name="endsAt" type="datetime-local" required={false} defaultValue={defaults.endsAt} errors={fe?._form} />
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-sm text-ivory/85">
        <input type="checkbox" name="active" defaultChecked={defaults.active} className="h-4 w-4 accent-[var(--color-gold)]" />
        Ativo
      </label>
      <SubmitButton pendingLabel="Salvando..." className="sm:w-auto">
        Salvar cupom
      </SubmitButton>
    </form>
  );
}
