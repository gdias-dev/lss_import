"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/app/(auth)/actions";
import { FormAlert } from "@/components/ui/FormAlert";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormState } from "@/lib/form-state";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetPasswordAction, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormAlert state={state} />
      <input type="hidden" name="token" value={token} />
      <PasswordField label="Nova senha" name="password" autoComplete="new-password" errors={state.fieldErrors?.password ?? state.fieldErrors?.token} hint="Pelo menos 8 caracteres." />
      <SubmitButton pendingLabel="Salvando...">Salvar nova senha</SubmitButton>
    </form>
  );
}
