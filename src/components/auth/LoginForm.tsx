"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormState } from "@/lib/form-state";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormAlert state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} errors={state.fieldErrors?.email} />
      <PasswordField label="Senha" name="password" autoComplete="current-password" errors={state.fieldErrors?.password} />
      <div className="text-right">
        <Link href="/esqueci-senha" className="text-xs text-gold transition hover:text-gold-soft">
          Esqueci minha senha
        </Link>
      </div>
      <SubmitButton pendingLabel="Entrando...">Entrar</SubmitButton>
    </form>
  );
}
