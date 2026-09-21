"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/conta/actions";
import { FormAlert } from "@/components/ui/FormAlert";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormState } from "@/lib/form-state";

export function ChangePasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormAlert state={state} />
      <PasswordField label="Senha atual" name="current" autoComplete="current-password" errors={state.fieldErrors?.current} />
      <PasswordField label="Nova senha" name="password" autoComplete="new-password" errors={state.fieldErrors?.password} hint="Pelo menos 8 caracteres." />
      <SubmitButton pendingLabel="Alterando..." className="sm:w-auto">
        Alterar senha
      </SubmitButton>
    </form>
  );
}
