import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { formatCep } from "@/lib/cep";
import { getSettings, installmentRules } from "@/lib/settings";
import { getCheckoutAddresses } from "@/server/checkout";
import { requireUser } from "@/server/auth/guards";
import { getCartView } from "@/server/cart";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const [cart, addresses, settings] = await Promise.all([getCartView(user.id), getCheckoutAddresses(user.id), getSettings()]);

  if (!cart.canCheckout) redirect("/carrinho");
  if (!user.emailVerifiedAt) {
    return (
      <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
        <p className="eyebrow mb-3">Finalizar compra</p>
        <h1 className="section-title mb-4">Confirme seu e-mail para continuar</h1>
        <p className="mb-8 max-w-md text-muted">Por segurança, é preciso confirmar o e-mail antes de finalizar uma compra.</p>
        <Link href="/conta" className="btn-primary">
          Ir para minha conta
        </Link>
      </div>
    );
  }
  if (addresses.length === 0) {
    return (
      <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
        <p className="eyebrow mb-3">Finalizar compra</p>
        <h1 className="section-title mb-4">Cadastre um endereço de entrega</h1>
        <p className="mb-8 max-w-md text-muted">Você ainda não tem nenhum endereço salvo.</p>
        <Link href="/conta/enderecos/novo?next=/checkout" className="btn-primary">
          Adicionar endereço
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-14">
      <p className="eyebrow mb-3">Finalizar compra</p>
      <h1 className="section-title mb-10">Checkout</h1>
      <CheckoutClient
        addresses={addresses.map((a) => ({ id: a.id, label: a.label, recipient: a.recipient, cepFormatted: formatCep(a.cep), street: a.street, number: a.number, complement: a.complement, neighborhood: a.neighborhood, city: a.city, state: a.state, isDefault: a.isDefault }))}
        cart={cart}
        hasCpf={Boolean(user.cpf)}
        settings={{ installmentsInterestFreeMax: settings.installmentsInterestFreeMax, minInstallmentCents: settings.minInstallmentCents, monthlyInterestRate: settings.monthlyInterestRate, debitEnabled: settings.debitEnabled }}
        installmentRules={installmentRules(settings)}
        mpPublicKey={process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? null}
      />
    </div>
  );
}
