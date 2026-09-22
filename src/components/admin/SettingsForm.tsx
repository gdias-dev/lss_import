"use client";

import { useActionState } from "react";
import { updateSettingsAction } from "@/app/admin/config/actions";
import { Field } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormState } from "@/lib/form-state";
import type { StoreSettings } from "@/lib/settings-defaults";

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const [state, action] = useActionState<FormState, FormData>(updateSettingsAction, {});
  const fe = state.fieldErrors;

  return (
    <form action={action} className="max-w-2xl space-y-10" noValidate>
      <FormAlert state={state} />

      <fieldset className="space-y-5">
        <legend className="eyebrow mb-1">Dados da loja</legend>
        <Field label="Nome da loja" name="storeName" defaultValue={settings.storeName} errors={fe?.storeName} />
        <Field label="CNPJ" name="cnpj" required={false} defaultValue={settings.cnpj ?? ""} errors={fe?.cnpj} placeholder="00.000.000/0000-00" />
        <p className="text-sm text-muted">
          Número do WhatsApp: definido pela variável de ambiente <code className="text-ivory/80">WHATSAPP_NUMBER</code>, não por aqui — peça ao desenvolvedor para trocar.
        </p>
        <Field label="Instagram" name="instagramUrl" required={false} defaultValue={settings.instagramUrl} errors={fe?.instagramUrl} />
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="eyebrow mb-1">Pagamento</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Parcelas sem juros (máximo)" name="installmentsInterestFreeMax" type="number" inputMode="numeric" defaultValue={String(settings.installmentsInterestFreeMax)} errors={fe?.installmentsInterestFreeMax} />
          <Field label="Valor mínimo da parcela (R$)" name="minInstallmentCents" type="number" inputMode="decimal" defaultValue={String(settings.minInstallmentCents / 100)} errors={fe?.minInstallmentCents} hint="Digite em reais, ex.: 30" />
          <Field label="Juros ao mês acima do limite (%)" name="monthlyInterestRate" type="number" inputMode="decimal" defaultValue={String(settings.monthlyInterestRate * 100)} errors={fe?.monthlyInterestRate} hint="0 = nunca cobra juros" />
          <Field label="Desconto no Pix (%)" name="pixDiscountPercent" type="number" inputMode="decimal" defaultValue={String(settings.pixDiscountPercent)} errors={fe?.pixDiscountPercent} />
          <Field label="Pix expira em (minutos)" name="pixExpirationMinutes" type="number" inputMode="numeric" defaultValue={String(settings.pixExpirationMinutes)} errors={fe?.pixExpirationMinutes} />
        </div>
        <label className="flex cursor-pointer items-center gap-3 text-sm text-ivory/85">
          <input type="checkbox" name="debitEnabled" defaultChecked={settings.debitEnabled} className="h-4 w-4 accent-[var(--color-gold)]" />
          Aceitar cartão de débito (confirme com o gateway antes de ativar)
        </label>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="eyebrow mb-1">Entrega</legend>
        <Field label="Frete grátis a partir de (R$)" name="freeShippingAboveCents" type="number" inputMode="decimal" defaultValue={String(settings.freeShippingAboveCents / 100)} errors={fe?.freeShippingAboveCents} hint="0 = desligado" />
        <Field label="Prazo de preparo (dias úteis)" name="handlingDays" type="number" inputMode="numeric" defaultValue={String(settings.handlingDays)} errors={fe?.handlingDays} />
        <label className="flex cursor-pointer items-center gap-3 text-sm text-ivory/85">
          <input type="checkbox" name="pickupEnabled" defaultChecked={settings.pickupEnabled} className="h-4 w-4 accent-[var(--color-gold)]" />
          Permitir retirada na loja
        </label>
      </fieldset>

      <SubmitButton pendingLabel="Salvando..." className="sm:w-auto">
        Salvar configurações
      </SubmitButton>
    </form>
  );
}
