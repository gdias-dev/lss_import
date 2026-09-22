"use client";

import { useActionState, useState } from "react";
import { changeOrderStatusAction } from "@/app/admin/pedidos/actions";
import { Field, inputClass } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormState } from "@/lib/form-state";

const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  PAGO: [{ value: "EM_SEPARACAO", label: "Em separação" }, { value: "ENVIADO", label: "Enviado" }, { value: "CANCELADO", label: "Cancelado" }],
  EM_SEPARACAO: [{ value: "ENVIADO", label: "Enviado" }, { value: "CANCELADO", label: "Cancelado" }],
  ENVIADO: [{ value: "ENTREGUE", label: "Entregue" }],
  AGUARDANDO_PAGAMENTO_NA_ENTREGA: [{ value: "EM_SEPARACAO", label: "Em separação" }, { value: "ENVIADO", label: "Enviado" }, { value: "CANCELADO", label: "Cancelado" }],
};

export function OrderStatusForm({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const options = NEXT_STATUS[currentStatus] ?? [];
  const [status, setStatus] = useState(options[0]?.value ?? "");
  const [state, action] = useActionState<FormState, FormData>(changeOrderStatusAction, {});

  if (options.length === 0) return null;

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-line bg-surface p-6">
      <FormAlert state={state} />
      <input type="hidden" name="orderId" value={orderId} />
      <div>
        <label htmlFor="novo-status" className="mb-2 block text-sm text-ivory/85">
          Mudar status para
        </label>
        <select id="novo-status" name="status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {status === "ENVIADO" && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Transportadora" name="carrier" required={false} placeholder="Ex.: Correios" />
          <Field label="Código de rastreio" name="trackingCode" required={false} />
        </div>
      )}
      <SubmitButton pendingLabel="Salvando..." className="sm:w-auto">
        Confirmar
      </SubmitButton>
      {status === "ENVIADO" && <p className="text-xs text-muted">A compra automática da etiqueta pelo Melhor Envio ainda não está pronta — gere fora e cole o código de rastreio acima. O e-mail de "enviado" é disparado ao confirmar.</p>}
    </form>
  );
}
