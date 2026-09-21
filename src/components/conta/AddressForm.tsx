"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { saveAddressAction } from "@/app/conta/actions";
import { Field, inputClass } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatCep, isValidCep, normalizeCep } from "@/lib/cep";
import type { FormState } from "@/lib/form-state";
import { UF } from "@/lib/validators/auth";

export interface AddressValues {
  label: string;
  recipient: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  isDefault: boolean;
}

export const EMPTY_ADDRESS: AddressValues = { label: "", recipient: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", isDefault: false };

export function AddressForm({ id, defaults, forceDefault }: { id?: string; defaults: AddressValues; forceDefault?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(saveAddressAction, {});
  const [v, setV] = useState<AddressValues>({ ...defaults, cep: formatCep(defaults.cep) });
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "notfound" | "error">("idle");
  const lastLookup = useRef("");
  const fe = state.fieldErrors;
  const set = (key: keyof AddressValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((prev) => ({ ...prev, [key]: e.target.value }));

  async function onCepChange(e: React.ChangeEvent<HTMLInputElement>) {
    const cep = formatCep(e.target.value);
    setV((prev) => ({ ...prev, cep }));
    const digits = normalizeCep(cep);
    if (!isValidCep(digits) || digits === lastLookup.current) return;
    lastLookup.current = digits;
    setCepStatus("loading");
    try {
      const res = await fetch(`/api/cep/${digits}`);
      if (res.status === 404) return setCepStatus("notfound");
      if (!res.ok) return setCepStatus("error");
      const found = (await res.json()) as { street: string; neighborhood: string; city: string; state: string };
      setV((prev) => ({ ...prev, street: found.street || prev.street, neighborhood: found.neighborhood || prev.neighborhood, city: found.city || prev.city, state: found.state || prev.state }));
      setCepStatus("idle");
    } catch {
      setCepStatus("error");
    }
  }

  const cepHint = cepStatus === "loading" ? "Buscando endereço..." : cepStatus === "notfound" ? "CEP não encontrado. Preencha o endereço manualmente." : cepStatus === "error" ? "Não foi possível buscar o CEP agora. Preencha manualmente." : "Digite o CEP e preenchemos o resto.";

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormAlert state={state} />
      {id && <input type="hidden" name="id" value={id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nome de quem recebe" name="recipient" autoComplete="name" value={v.recipient} onChange={set("recipient")} errors={fe?.recipient} className="sm:col-span-2" />
        <Field label="CEP" name="cep" autoComplete="postal-code" inputMode="numeric" maxLength={9} value={v.cep} onChange={onCepChange} errors={fe?.cep} hint={cepHint} />
        <Field label="Apelido do endereço" name="label" placeholder="Casa, Trabalho..." value={v.label} onChange={set("label")} errors={fe?.label} required={false} />
        <Field label="Rua" name="street" autoComplete="address-line1" value={v.street} onChange={set("street")} errors={fe?.street} className="sm:col-span-2" />
        <Field label="Número" name="number" maxLength={10} value={v.number} onChange={set("number")} errors={fe?.number} />
        <Field label="Complemento" name="complement" autoComplete="address-line2" value={v.complement} onChange={set("complement")} errors={fe?.complement} required={false} />
        <Field label="Bairro" name="neighborhood" value={v.neighborhood} onChange={set("neighborhood")} errors={fe?.neighborhood} />
        <Field label="Cidade" name="city" autoComplete="address-level2" value={v.city} onChange={set("city")} errors={fe?.city} />
        <div>
          <label htmlFor="campo-state" className="mb-2 block text-sm text-ivory/85">Estado</label>
          <select id="campo-state" name="state" value={v.state} onChange={set("state")} aria-invalid={fe?.state ? true : undefined} className={inputClass}>
            <option value="">Selecione</option>
            {UF.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
          {fe?.state?.[0] && <p role="alert" className="mt-1.5 text-xs text-red-300">{fe.state[0]}</p>}
        </div>
      </div>

      {forceDefault ? (
        <p className="text-sm text-muted">Este será o seu endereço padrão.</p>
      ) : (
        <label className="flex cursor-pointer items-center gap-3 text-sm text-ivory/80">
          <input type="checkbox" name="isDefault" defaultChecked={defaults.isDefault} className="h-4 w-4 accent-[var(--color-gold)]" />
          Usar como endereço padrão
        </label>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SubmitButton pendingLabel="Salvando..." className="sm:w-auto">Salvar endereço</SubmitButton>
        <Link href="/conta/enderecos" className="btn-outline">Cancelar</Link>
      </div>
    </form>
  );
}
