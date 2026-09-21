"use client";

import { useState } from "react";
import { buildInstallments, formatBRL, percentOf, type InstallmentRules } from "@/lib/money";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export interface PurchaseVariant {
  id: string;
  label: string;
  sizeMl: number;
  priceCents: number;
  compareAtCents: number | null;
  stockQty: number;
}

const LOW_STOCK = 3;

// O botão "Adicionar ao carrinho" entra na Etapa 5 e usa o `selected.id` daqui.
export function ProductPurchase({
  productName,
  brandName,
  variants,
  rules,
  pixDiscountPercent,
  whatsappNumber,
}: {
  productName: string;
  brandName: string;
  variants: PurchaseVariant[];
  rules: InstallmentRules;
  pixDiscountPercent: number;
  whatsappNumber: string | null;
}) {
  const initial = variants.find((v) => v.stockQty > 0) ?? variants[0];
  const [selectedId, setSelectedId] = useState(initial?.id);
  const selected = variants.find((v) => v.id === selectedId) ?? initial;
  if (!selected) return <p className="text-muted">Produto indisponível no momento.</p>;

  const available = selected.stockQty > 0;
  const discount = selected.compareAtCents && selected.compareAtCents > selected.priceCents ? Math.round((1 - selected.priceCents / selected.compareAtCents) * 100) : 0;
  const installments = buildInstallments(selected.priceCents, rules).filter((p) => p.count > 1);
  const pixCents = pixDiscountPercent > 0 ? selected.priceCents - percentOf(selected.priceCents, pixDiscountPercent) : null;

  return (
    <div>
      <h2 className="eyebrow mb-3">Tamanho</h2>
      <div role="radiogroup" aria-label="Escolha o tamanho" className="mb-8 flex flex-wrap gap-3">
        {variants.map((v) => {
          const active = v.id === selected.id;
          const out = v.stockQty <= 0;
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelectedId(v.id)}
              className={cn("rounded-full border px-5 py-2 text-sm transition", active ? "border-gold bg-gold text-ink" : "border-line text-ivory/85 hover:border-gold/60", out && !active && "opacity-60")}
            >
              {v.label}
              {out && <span className="ml-2 text-xs">(esgotado)</span>}
            </button>
          );
        })}
      </div>

      <div className="mb-6 space-y-1" aria-live="polite">
        <p className="flex flex-wrap items-baseline gap-3">
          <span className="font-serif text-4xl text-ivory">{formatBRL(selected.priceCents)}</span>
          {discount > 0 && selected.compareAtCents && (
            <>
              <span className="text-muted line-through">{formatBRL(selected.compareAtCents)}</span>
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold">-{discount}%</span>
            </>
          )}
        </p>
        {pixCents !== null && (
          <p className="text-sm text-gold">
            {formatBRL(pixCents)} no Pix ({pixDiscountPercent}% de desconto)
          </p>
        )}
        <p className={cn("text-sm", available ? "text-muted" : "text-ivory/70")}>
          {!available ? "Este tamanho está esgotado." : selected.stockQty <= LOW_STOCK ? "Poucas unidades disponíveis." : "Disponível para envio."}
        </p>
      </div>

      {installments.length > 0 && (
        <details className="mb-8 rounded-xl border border-line px-5 py-4">
          <summary className="cursor-pointer text-sm text-ivory">Ver opções de parcelamento</summary>
          <ul className="mt-3 space-y-1 text-sm text-ivory/80">
            {installments.map((p) => (
              <li key={p.count} className="flex justify-between gap-4">
                <span>
                  {p.count}x de {formatBRL(p.installmentCents)}
                </span>
                <span className="text-muted">{p.hasInterest ? `total ${formatBRL(p.totalCents)}` : "sem juros"}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {whatsappNumber && (
        <a
          href={buildWhatsAppLink(whatsappNumber, `Olá! Tenho interesse no perfume ${productName} (${brandName}), tamanho ${selected.label}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline"
        >
          Perguntar no WhatsApp
        </a>
      )}
    </div>
  );
}
