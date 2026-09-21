"use client";

import { useActionState } from "react";
import { applyCouponAction, removeCouponAction } from "@/app/carrinho/actions";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { inputClass } from "@/components/ui/Field";
import type { FormState } from "@/lib/form-state";

export function CouponForm({ appliedCode, error }: { appliedCode: string | null; error?: string | null }) {
  const [state, action] = useActionState<FormState, FormData>(applyCouponAction, {});

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
        <span className="text-gold">
          Cupom <strong>{appliedCode}</strong> aplicado
        </span>
        <form action={removeCouponAction}>
          <button type="submit" className="text-xs text-muted transition hover:text-gold">
            Remover
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3" noValidate>
      {error && (
        <p role="status" className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          Cupom removido: {error}
        </p>
      )}
      <label htmlFor="cupom" className="block text-sm text-ivory/85">
        Tem um cupom?
      </label>
      <div className="flex gap-2">
        <input id="cupom" name="code" autoComplete="off" autoCapitalize="characters" maxLength={30} placeholder="Digite o código" className={`${inputClass} uppercase`} />
        <div className="shrink-0">
          <SubmitButton variant="outline" pendingLabel="..." className="px-5">
            Aplicar
          </SubmitButton>
        </div>
      </div>
      <FormAlert state={state} />
    </form>
  );
}
