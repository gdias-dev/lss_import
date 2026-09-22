import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PixPanel } from "@/components/checkout/PixPanel";
import { formatCep } from "@/lib/cep";
import { getWhatsAppNumber } from "@/lib/env";
import { formatBRL } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";
import { buildOrderWhatsAppMessage, buildWhatsAppLink, formatOrderNumber } from "@/lib/whatsapp";
import { requireUser } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Pedido confirmado", robots: { index: false } };
export const dynamic = "force-dynamic";

const PAYMENT_LABEL: Record<string, string> = { PIX: "Pix", CREDIT_CARD: "Cartão de crédito", DEBIT_CARD: "Cartão de débito", CASH_ON_DELIVERY: "Dinheiro na entrega", CARD_ON_DELIVERY: "Cartão na entrega" };

export default async function OrderConfirmedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/pedido/${id}/confirmado`);
  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: { items: true, shipment: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!order) notFound();

  const address = order.addressSnapshot as { recipient: string; street: string; number: string; complement: string | null; neighborhood: string; city: string; state: string; cep: string };
  const addressLine = `${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ""}, ${address.neighborhood}, ${address.city}/${address.state}, CEP ${formatCep(address.cep)}`;
  const payment = order.payments[0];
  const whatsappNumber = getWhatsAppNumber();

  const whatsappMessage = whatsappNumber
    ? buildOrderWhatsAppMessage({
        number: order.number,
        customerName: address.recipient,
        items: order.items.map((i) => ({ name: i.productName, variantLabel: i.variantLabel, quantity: i.quantity, totalCents: i.totalCents })),
        subtotalCents: order.subtotalCents,
        discountCents: order.discountCents,
        shippingCents: order.shippingCents,
        interestCents: order.interestCents,
        totalCents: order.totalCents,
        couponCode: order.couponCode,
        shippingLabel: order.shipment?.service ?? (order.shippingMethod === "PICKUP" ? "Retirada na loja" : "Entrega"),
        paymentLabel: PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod,
        addressLine,
        orderUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/conta/pedidos/${order.id}`,
      })
    : null;

  return (
    <div className="container-page max-w-2xl py-14">
      <p className="eyebrow mb-3">Pedido {formatOrderNumber(order.number)}</p>
      <h1 className="section-title mb-8">
        {order.paymentMethod === "PIX" && order.status === "AGUARDANDO_PAGAMENTO" ? "Falta só o pagamento" : "Pedido recebido!"}
      </h1>

      {order.paymentMethod === "PIX" && order.status === "AGUARDANDO_PAGAMENTO" && payment && (
        <div className="mb-10">
          <PixPanel orderId={order.id} totalCents={order.totalCents} qrCode={payment.pixCopyPaste} qrCodeBase64={(payment.rawPayload as { point_of_interaction?: { transaction_data?: { qr_code_base64?: string } } } | null)?.point_of_interaction?.transaction_data?.qr_code_base64 ?? null} expiresAt={payment.expiresAt?.toISOString() ?? null} />
        </div>
      )}

      {order.status === "AGUARDANDO_PAGAMENTO_NA_ENTREGA" && (
        <p className="mb-10 rounded-2xl border border-gold/40 bg-gold/10 p-6 text-sm text-gold">Pagamento combinado para a entrega{order.changeForCents ? ` (troco para ${formatBRL(order.changeForCents)})` : ""}.</p>
      )}
      {order.status === "PAGO" && <p className="mb-10 rounded-2xl border border-gold/40 bg-gold/10 p-6 text-sm text-gold">Pagamento confirmado. Já vamos preparar o seu pedido.</p>}

      {whatsappMessage && whatsappNumber && (
        <a href={buildWhatsAppLink(whatsappNumber, whatsappMessage)} target="_blank" rel="noopener noreferrer" className="btn-primary mb-10 inline-flex">
          Enviar pedido no WhatsApp
        </a>
      )}

      <div className="space-y-6 rounded-2xl border border-line bg-surface p-6">
        <div>
          <h2 className="eyebrow mb-2">Status</h2>
          <p className="text-ivory">{ORDER_STATUS_LABEL[order.status] ?? order.status}</p>
        </div>
        <div>
          <h2 className="eyebrow mb-2">Itens</h2>
          <ul className="space-y-1 text-sm text-ivory/85">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4">
                <span>
                  {i.quantity}x {i.productName} ({i.variantLabel})
                </span>
                <span>{formatBRL(i.totalCents)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-1 border-t border-line pt-4 text-sm">
          <div className="flex justify-between text-ivory/75">
            <span>Subtotal</span>
            <span>{formatBRL(order.subtotalCents)}</span>
          </div>
          {order.discountCents > 0 && (
            <div className="flex justify-between text-gold">
              <span>Desconto{order.couponCode ? ` (${order.couponCode})` : ""}</span>
              <span>-{formatBRL(order.discountCents)}</span>
            </div>
          )}
          <div className="flex justify-between text-ivory/75">
            <span>Frete</span>
            <span>{order.shippingCents === 0 ? "Grátis" : formatBRL(order.shippingCents)}</span>
          </div>
          {order.interestCents > 0 && (
            <div className="flex justify-between text-ivory/75">
              <span>Juros</span>
              <span>{formatBRL(order.interestCents)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-2 text-base text-ivory">
            <span>Total</span>
            <span className="font-medium">{formatBRL(order.totalCents)}</span>
          </div>
        </div>
        <div>
          <h2 className="eyebrow mb-2">Entrega</h2>
          <p className="text-sm text-ivory/85">{addressLine}</p>
        </div>
      </div>

      <Link href="/conta/pedidos" className="mt-8 inline-block text-sm text-gold transition hover:text-gold-soft">
        Ver todos os meus pedidos
      </Link>
    </div>
  );
}
