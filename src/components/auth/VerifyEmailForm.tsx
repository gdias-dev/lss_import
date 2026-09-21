"use client";

import { useActionState } from "react";
import { verifyEmailAction } from "@/app/(auth)/actions";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormState } from "@/lib/form-state";

/** O e-mail só é confirmado ao clicar no botão (evita que antivírus ou prévias de link gastem o token). */
export function VerifyEmailForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(verifyEmailAction, {});
  return (
    <form action={action} className="space-y-5">
      <FormAlert state={state} />
      <input type="hidden" name="token" value={token} />
      <SubmitButton pendingLabel="Confirmando...">Confirmar meu e-mail</SubmitButton>
    </form>
  );
}
