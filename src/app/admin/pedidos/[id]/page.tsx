import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { confirmCashPaymentAction } from "@/app/admin/pedidos/actions";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { ShippingLabelButton } from "@/components/admin/ShippingLabelButton";
import { formatCep } from "@/lib/cep";
import { getWhatsAppNumber } from "@/lib/env";
import { formatBRL } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { buildWhatsAppLink, formatOrderNumber } from "@/lib/whatsapp";
import { requireAdmin } from "@/server/auth/guards";
import { getAdminOrder } from "@/server/admin/orders";
import { isMelhorEnvioConfigured } from "@/server/admin/shipping-label";

export const metadata: Metadata = { title: "Detalhe do pedido" };

const PAYMENT_LABEL: Record<string, string> = { PIX: "Pix", CREDIT_CARD: "Cartão de crédito", DEBIT_CARD: "Cartão de débito", CASH_ON_DELIVERY: "Dinheiro na entrega", CARD_ON_DELIVERY: "Cartão na entrega" };

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const address = order.addressSnapshot as { recipient: string; street: string; number: string; complement: string | null; neighborhood: string; city: string; state: string; cep: string };
  const whatsapp = getWhatsAppNumber();

  return (
    <div>
      <Link href="/admin/pedidos" className="mb-6 inline-block text-sm text-muted transition hover:text-gold">
        ← Todos os pedidos
      </Link>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="section-title">Pedido {formatOrderNumber(order.number)}</h1>
        {whatsapp && (
          <a href={buildWhatsAppLink(whatsapp, `Olá, ${address.recipient}! Aqui é da LS Imports, sobre o pedido ${formatOrderNumber(order.number)}.`)} target="_blank" rel="noopener noreferrer" className="btn-outline">
            Falar no WhatsApp
          </a>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6 rounded-2xl border border-line bg-surface p-6">
          <div>
            <h2 className="eyebrow mb-2">Cliente</h2>
            <p className="text-sm text-ivory/85">
              {order.user.name} · {order.user.email}
            </p>
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
                <span>Desconto{order.coupon ? ` (${order.coupon.code})` : ""}</span>
                <span>-{formatBRL(order.discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-ivory/75">
              <span>Frete ({order.shipment?.service ?? order.shippingMethod})</span>
              <span>{order.shippingCents === 0 ? "Grátis" : formatBRL(order.shippingCents)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base text-ivory">
              <span>Total</span>
              <span className="font-medium">{formatBRL(order.totalCents)}</span>
            </div>
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
            {order.shipment?.trackingCode && (
              <p className="mt-2 text-sm text-gold">
                Rastreio: {order.shipment.trackingCode} ({order.shipment.carrier})
              </p>
            )}
            {order.shipment?.labelUrl && (
              <a href={order.shipment.labelUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-gold underline-offset-2 hover:underline">
                Baixar etiqueta (PDF)
              </a>
            )}
          </div>
          <div>
            <h2 className="eyebrow mb-2">Pagamento</h2>
            <p className="text-sm text-ivory/85">{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
            {order.payments[0] && <p className="text-xs text-muted">Gateway: {order.payments[0].provider} · status {order.payments[0].status}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="eyebrow mb-2">Status atual</h2>
            <p className="mb-4 font-serif text-2xl text-ivory">{ORDER_STATUS_LABEL[order.status] ?? order.status}</p>
            {order.status === "AGUARDANDO_PAGAMENTO_NA_ENTREGA" && (
              <form action={confirmCashPaymentAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <button type="submit" className="btn-primary w-full">
                  Confirmar pagamento recebido
                </button>
              </form>
            )}
          </div>
          {order.shippingMethod === "CORREIOS" && !order.shipment?.trackingCode && ["PAGO", "EM_SEPARACAO"].includes(order.status) && (
            <div className="rounded-2xl border border-line bg-surface p-6">
              <h2 className="eyebrow mb-3">Etiqueta dos Correios</h2>
              <ShippingLabelButton orderId={order.id} configured={isMelhorEnvioConfigured()} />
            </div>
          )}
          <OrderStatusForm orderId={order.id} currentStatus={order.status} />
        </div>
      </div>
    </div>
  );
}
