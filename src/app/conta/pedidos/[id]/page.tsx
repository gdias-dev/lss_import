import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PixPanel } from "@/components/checkout/PixPanel";
import { formatCep } from "@/lib/cep";
import { formatBRL } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";
import { formatOrderNumber } from "@/lib/whatsapp";
import { requireUser } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Detalhe do pedido" };

const PAYMENT_LABEL: Record<string, string> = { PIX: "Pix", CREDIT_CARD: "Cartão de crédito", DEBIT_CARD: "Cartão de débito", CASH_ON_DELIVERY: "Dinheiro na entrega", CARD_ON_DELIVERY: "Cartão na entrega" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/conta/pedidos/${id}`);
  const order = await prisma.order.findFirst({ where: { id, userId: user.id }, include: { items: true, shipment: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!order) notFound();

  const address = order.addressSnapshot as { recipient: string; street: string; number: string; complement: string | null; neighborhood: string; city: string; state: string; cep: string };
  const payment = order.payments[0];

  return (
    <div>
      <Link href="/conta/pedidos" className="mb-6 inline-block text-sm text-muted transition hover:text-gold">
        ← Todos os pedidos
      </Link>
      <h1 className="section-title mb-2">Pedido {formatOrderNumber(order.number)}</h1>
      <p className="mb-8 text-sm text-muted">Feito em {order.createdAt.toLocaleDateString("pt-BR")}</p>

      {order.paymentMethod === "PIX" && order.status === "AGUARDANDO_PAGAMENTO" && payment && (
        <div className="mb-8 max-w-md">
          <PixPanel orderId={order.id} totalCents={order.totalCents} qrCode={payment.pixCopyPaste} qrCodeBase64={(payment.rawPayload as { point_of_interaction?: { transaction_data?: { qr_code_base64?: string } } } | null)?.point_of_interaction?.transaction_data?.qr_code_base64 ?? null} expiresAt={payment.expiresAt?.toISOString() ?? null} />
        </div>
      )}

      <div className="max-w-xl space-y-6 rounded-2xl border border-line bg-surface p-6">
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
            <span>Frete ({order.shipment?.service ?? order.shippingMethod})</span>
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
          <h2 className="eyebrow mb-2">Pagamento</h2>
          <p className="text-sm text-ivory/85">{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
        </div>
        <div>
          <h2 className="eyebrow mb-2">Entrega</h2>
          <p className="text-sm text-ivory/85">
            {address.recipient}
            <br />
            {address.street}, {address.number}
            {address.complement ? ` - ${address.complement}` : ""}
            <br />
            {address.neighborhood} · {address.city}/{address.state} · CEP {formatCep(address.cep)}
          </p>
        </div>
      </div>
    </div>
  );
}
