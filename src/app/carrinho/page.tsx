import type { Metadata } from "next";
import Link from "next/link";
import { clearUnavailableAction } from "@/app/carrinho/actions";
import { CartLineItem } from "@/components/carrinho/CartLineItem";
import { CartSummaryPanel } from "@/components/carrinho/CartSummaryPanel";
import { CartSync } from "@/components/carrinho/CartSync";
import { requireUser } from "@/server/auth/guards";
import { getCartView } from "@/server/cart";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CarrinhoPage() {
  const user = await requireUser("/carrinho");
  const cart = await getCartView(user.id);

  if (cart.lines.length === 0) {
    return (
      <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
        <CartSync count={0} />
        <p className="eyebrow mb-3">Carrinho</p>
        <h1 className="section-title mb-4">Seu carrinho está vazio</h1>
        <p className="mb-8 max-w-md text-muted">Explore os perfumes e adicione seus favoritos.</p>
        <Link href="/perfumes" className="btn-primary">
          Ver perfumes
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-14">
      <CartSync count={cart.itemCount} />
      <p className="eyebrow mb-3">Carrinho</p>
      <h1 className="section-title mb-10">Meu carrinho</h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
        <section aria-label="Produtos no carrinho">
          {cart.hasBlockingIssues && (
            <form action={clearUnavailableAction} className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              <span>Alguns produtos ficaram indisponíveis.</span>
              <button type="submit" className="underline-offset-2 hover:underline">
                Remover indisponíveis
              </button>
            </form>
          )}
          <ul className="space-y-4">
            {cart.lines.map((line) => (
              <CartLineItem key={line.id} line={line} />
            ))}
          </ul>
          <Link href="/perfumes" className="mt-6 inline-block text-sm text-gold transition hover:text-gold-soft">
            ← Continuar comprando
          </Link>
        </section>

        <CartSummaryPanel cart={cart} />
      </div>
    </div>
  );
}
