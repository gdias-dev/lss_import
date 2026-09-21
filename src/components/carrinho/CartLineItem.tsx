import Image from "next/image";
import Link from "next/link";
import { removeItemAction, updateQuantityAction } from "@/app/carrinho/actions";
import type { CartLine } from "@/lib/cart";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

function Stepper({ line }: { line: CartLine }) {
  const btn = "flex h-9 w-9 items-center justify-center text-lg text-ivory transition hover:text-gold disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="inline-flex items-center rounded-full border border-line" role="group" aria-label={`Quantidade de ${line.productName}`}>
      <form action={updateQuantityAction}>
        <input type="hidden" name="itemId" value={line.id} />
        <input type="hidden" name="quantity" value={line.effectiveQty - 1} />
        <button type="submit" aria-label="Diminuir quantidade" disabled={line.effectiveQty <= 1} className={btn}>
          −
        </button>
      </form>
      <span className="min-w-8 text-center text-sm text-ivory" aria-live="polite">
        {line.effectiveQty}
      </span>
      <form action={updateQuantityAction}>
        <input type="hidden" name="itemId" value={line.id} />
        <input type="hidden" name="quantity" value={line.effectiveQty + 1} />
        <button type="submit" aria-label="Aumentar quantidade" disabled={line.effectiveQty >= line.maxQty} className={btn}>
          +
        </button>
      </form>
    </div>
  );
}

const ISSUE_TEXT = {
  UNAVAILABLE: "Este produto não está mais disponível. Remova-o para continuar.",
  OUT_OF_STOCK: "Este tamanho esgotou. Remova-o para continuar.",
  REDUCED: "A quantidade foi ajustada ao estoque disponível.",
} as const;

export function CartLineItem({ line }: { line: CartLine }) {
  const blocked = line.issue === "UNAVAILABLE" || line.issue === "OUT_OF_STOCK";
  return (
    <li className={cn("flex gap-4 rounded-2xl border border-line bg-surface p-4 sm:gap-6 sm:p-5", blocked && "opacity-80")}>
      <Link href={`/produto/${line.slug}`} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-ink-soft sm:h-32 sm:w-28">
        {line.imageUrl ? (
          <Image src={line.imageUrl} alt={line.imageAlt ?? line.productName} fill sizes="112px" className="object-cover" />
        ) : (
          <span aria-hidden className="flex h-full items-center justify-center font-serif text-4xl text-gold/60">
            {line.brandName.charAt(0)}
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">{line.brandName}</p>
        <Link href={`/produto/${line.slug}`} className="font-serif text-xl leading-snug text-ivory transition hover:text-gold">
          {line.productName}
        </Link>
        <p className="mt-1 text-sm text-muted">{line.variantLabel}</p>
        <p className="mt-2 text-sm text-ivory/85">
          {formatBRL(line.priceCents)}
          {line.compareAtCents && line.compareAtCents > line.priceCents && <span className="ml-2 text-muted line-through">{formatBRL(line.compareAtCents)}</span>}
        </p>

        {line.issue && (
          <p role="status" className={cn("mt-2 text-xs", blocked ? "text-red-300" : "text-gold")}>
            {ISSUE_TEXT[line.issue]}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          {blocked ? <span /> : <Stepper line={line} />}
          <div className="flex items-center gap-5">
            {!blocked && <p className="font-medium text-ivory">{formatBRL(line.lineTotalCents)}</p>}
            <form action={removeItemAction}>
              <input type="hidden" name="itemId" value={line.id} />
              <button type="submit" className="text-sm text-muted transition hover:text-red-300">
                Remover
              </button>
            </form>
          </div>
        </div>
      </div>
    </li>
  );
}
