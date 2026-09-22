import Link from "next/link";
import { CouponForm } from "@/components/carrinho/CouponForm";
import type { CartSummary } from "@/lib/cart";
import { formatBRL } from "@/lib/money";

export function CartSummaryPanel({ cart }: { cart: CartSummary }) {
  const fs = cart.freeShipping;
  const progress = fs && !fs.byCoupon && fs.thresholdCents > 0 ? Math.min(100, Math.round(((fs.thresholdCents - fs.missingCents) / fs.thresholdCents) * 100)) : 0;

  return (
    <aside aria-label="Resumo do pedido" className="h-fit space-y-6 rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-24">
      <h2 className="font-serif text-2xl text-ivory">Resumo</h2>

      <CouponForm appliedCode={cart.coupon?.code ?? null} error={cart.couponError} />

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-ivory/75">Produtos ({cart.itemCount})</dt>
          <dd className="text-ivory">{formatBRL(cart.subtotalCents)}</dd>
        </div>
        {cart.discountCents > 0 && (
          <div className="flex justify-between text-gold">
            <dt>Desconto ({cart.coupon?.code})</dt>
            <dd>-{formatBRL(cart.discountCents)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-ivory/75">Frete</dt>
          <dd className="text-muted">{fs?.byCoupon ? "Grátis (cupom)" : "Calculado na finalização"}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-4 text-base">
          <dt className="text-ivory">Total dos produtos</dt>
          <dd className="font-serif text-2xl text-ivory">{formatBRL(cart.totalCents)}</dd>
        </div>
        {cart.pix && (
          <p className="rounded-xl bg-gold/10 px-4 py-3 text-gold">
            <strong>{formatBRL(cart.pix.totalCents)}</strong> no Pix ({cart.pix.discountPercent}% de desconto nos produtos)
          </p>
        )}
      </dl>

      {fs && !fs.byCoupon && (
        <div>
          <p className="mb-2 text-xs text-ivory/80">{fs.reached ? "Você ganhou frete grátis." : `Faltam ${formatBRL(fs.missingCents)} para o frete grátis.`}</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso para o frete grátis">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div>
        {cart.canCheckout ? (
          <Link href="/checkout" className="btn-primary block w-full text-center">
            Finalizar compra
          </Link>
        ) : (
          <button type="button" disabled aria-disabled="true" className="btn-primary w-full cursor-not-allowed opacity-60">
            Finalizar compra
          </button>
        )}
        {!cart.canCheckout && <p className="mt-3 text-center text-xs text-muted">Remova os itens indisponíveis para continuar.</p>}
      </div>
    </aside>
  );
}
