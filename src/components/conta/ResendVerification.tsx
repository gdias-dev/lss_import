"use client";

import { useActionState } from "react";
import { resendVerificationAction } from "@/app/conta/actions";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormState } from "@/lib/form-state";

export function ResendVerification() {
  const [state, action] = useActionState<FormState>(resendVerificationAction, {});
  return (
    <form action={action} className="mt-4 space-y-3">
      <FormAlert state={state} />
      {!state.ok && (
        <SubmitButton variant="outline" pendingLabel="Enviando..." className="sm:w-auto">
          Reenviar e-mail de confirmação
        </SubmitButton>
      )}
    </form>
  );
}
