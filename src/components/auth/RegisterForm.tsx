"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormState } from "@/lib/form-state";

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(registerAction, {});
  const fe = state.fieldErrors;
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormAlert state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label="Nome completo" name="name" autoComplete="name" defaultValue={state.values?.name} errors={fe?.name} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} errors={fe?.email} />
      <Field label="Telefone (WhatsApp)" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="(21) 99999-9999" defaultValue={state.values?.phone} errors={fe?.phone} hint="Usamos para falar sobre a entrega do seu pedido." />
      <PasswordField label="Senha" name="password" autoComplete="new-password" errors={fe?.password} hint="Pelo menos 8 caracteres." />
      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ivory/80">
          <input type="checkbox" name="acceptTerms" className="mt-0.5 h-4 w-4 accent-[var(--color-gold)]" />
          <span>
            Li e aceito os{" "}
            <Link href="/termos" target="_blank" className="text-gold underline-offset-2 hover:underline">
              termos de uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" target="_blank" className="text-gold underline-offset-2 hover:underline">
              política de privacidade
            </Link>
            .
          </span>
        </label>
        {fe?.acceptTerms?.[0] && (
          <p role="alert" className="mt-1.5 text-xs text-red-300">
            {fe.acceptTerms[0]}
          </p>
        )}
      </div>
      <SubmitButton pendingLabel="Criando conta...">Criar conta</SubmitButton>
    </form>
  );
}
