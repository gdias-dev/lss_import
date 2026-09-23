"use client";

import { useActionState } from "react";
import { purchaseShippingLabelAction } from "@/app/admin/pedidos/actions";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormState } from "@/lib/form-state";

export function ShippingLabelButton({ orderId, configured }: { orderId: string; configured: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(purchaseShippingLabelAction, {});

  if (!configured) {
    return <p className="text-xs text-muted">Compra automática de etiqueta desativada: falta configurar o endereço de origem e o token do Melhor Envio no servidor (veja docs/PENDENCIAS.md).</p>;
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <FormAlert state={state} />
      <SubmitButton pendingLabel="Comprando etiqueta..." variant="outline">
        Comprar etiqueta pelo Melhor Envio
      </SubmitButton>
      <p className="text-xs text-muted">Debita o saldo da conta do Melhor Envio e marca o pedido como enviado automaticamente.</p>
    </form>
  );
}
