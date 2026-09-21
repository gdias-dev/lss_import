"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/conta/actions";
import { Field } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormState } from "@/lib/form-state";

export function ProfileForm({ defaults }: { defaults: { name: string; phone: string } }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfileAction, {});
  const v = state.values ?? defaults;
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormAlert state={state} />
      <Field label="Nome completo" name="name" autoComplete="name" defaultValue={v.name} errors={state.fieldErrors?.name} />
      <Field label="Telefone (WhatsApp)" name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={v.phone} errors={state.fieldErrors?.phone} />
      <SubmitButton pendingLabel="Salvando..." className="sm:w-auto">
        Salvar dados
      </SubmitButton>
    </form>
  );
}
