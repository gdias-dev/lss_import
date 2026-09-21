"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormState } from "@/lib/form-state";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(forgotPasswordAction, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormAlert state={state} />
      {!state.ok && <Field label="E-mail da sua conta" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} errors={state.fieldErrors?.email} />}
      {!state.ok && <SubmitButton pendingLabel="Enviando...">Enviar link</SubmitButton>}
    </form>
  );
}
