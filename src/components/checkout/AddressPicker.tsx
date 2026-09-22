"use client";

import Link from "next/link";

export interface AddressOption {
  id: string;
  label: string | null;
  recipient: string;
  cepFormatted: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  isDefault: boolean;
}

export function AddressPicker({ addresses, selectedId, onSelect }: { addresses: AddressOption[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="space-y-3" role="radiogroup" aria-label="Endereço de entrega">
      {addresses.map((a) => {
        const active = a.id === selectedId;
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(a.id)}
            className={`w-full rounded-xl border p-4 text-left text-sm transition ${active ? "border-gold bg-gold/10" : "border-line hover:border-gold/50"}`}
          >
            <p className="mb-1 flex items-center gap-2 font-medium text-ivory">
              {a.label || a.recipient}
              {a.isDefault && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[0.65rem] text-gold">Padrão</span>}
            </p>
            <p className="text-ivory/70">
              {a.street}, {a.number}
              {a.complement ? ` - ${a.complement}` : ""} · {a.neighborhood} · {a.city}/{a.state} · CEP {a.cepFormatted}
            </p>
          </button>
        );
      })}
      <Link href="/conta/enderecos/novo?next=/checkout" className="inline-block text-sm text-gold transition hover:text-gold-soft">
        + Adicionar outro endereço
      </Link>
    </div>
  );
}
