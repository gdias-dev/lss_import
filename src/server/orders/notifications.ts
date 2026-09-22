/**
 * Ponto único que decide QUAL e-mail mandar para cada mudança de status do pedido, e para quem.
 * As funções que só decidem (sem tocar banco/rede) ficam exportadas para teste; o resto lê o pedido
 * no Prisma e chama sendEmailSafely (nunca derruba o fluxo do cliente se o envio falhar).
 */
import { siteUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  adminNewOrderMessage,
  orderCanceledMessage,
  orderCardProcessingMessage,
  orderCashOnDeliveryMessage,
  orderDeliveredMessage,
  orderPixPendingMessage,
  orderShippedMessage,
  orderStatusLabel,
  paymentConfirmedMessage,
  type OrderEmailAddress,
  type OrderEmailData,
} from "@/server/emails/order-templates";
import { sendEmailSafely } from "@/server/emails/send";

type AddressSnapshot = OrderEmailAddress & { recipient?: string };

const orderInclude = { items: true, user: { select: { name: true, email: true } }, payments: { orderBy: { createdAt: "desc" as const }, take: 1 } } as const;

async function loadOrderEmailData(orderId: string): Promise<{ data: OrderEmailData; status: string; paymentMethod: string; expiresAt: Date | null } | null> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!order) return null;
  const address = order.addressSnapshot as unknown as AddressSnapshot;
  return {
    status: order.status,
    paymentMethod: order.paymentMethod,
    expiresAt: order.reservedUntil,
    data: {
      orderNumber: order.number,
      customerName: order.user.name,
      items: order.items.map((i) => ({ productName: i.productName, variantLabel: i.variantLabel, quantity: i.quantity, totalCents: i.totalCents })),
      totalCents: order.totalCents,
      address,
      orderUrl: `${siteUrl}/conta/pedidos/${order.id}`,
    },
  };
}

/** Público-facing: nunca expor a mensagem técnica de erro do gateway/estoque ao cliente. */
export function publicCancelReason(paymentMethod: string, technicalReason: string): string {
  if (/estoque|quantidade não|não tem mais/i.test(technicalReason)) return "um dos produtos não tinha mais estoque suficiente na hora da confirmação.";
  if (/expir/i.test(technicalReason)) return "o prazo de pagamento do Pix expirou.";
  if (paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD") return "o pagamento não foi aprovado pela operadora do cartão.";
  return "não foi possível concluir o pagamento.";
}

/** Enviado uma vez, logo depois que o pedido é criado (Pix pendente, na entrega, ou já pago no cartão). */
export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  const loaded = await loadOrderEmailData(orderId);
  if (!loaded) return;
  const { data, status, paymentMethod, expiresAt } = loaded;
  if (status === "AGUARDANDO_PAGAMENTO_NA_ENTREGA") return notifyCustomer(orderId, orderCashOnDeliveryMessage(data));
  if (status === "PAGO") return notifyCustomer(orderId, paymentConfirmedMessage(data));
  if (paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD") return notifyCustomer(orderId, orderCardProcessingMessage(data));
  return notifyCustomer(orderId, orderPixPendingMessage(data, expiresAt));
}

export async function sendPaymentConfirmedEmail(orderId: string): Promise<void> {
  const loaded = await loadOrderEmailData(orderId);
  if (!loaded) return;
  await notifyCustomer(orderId, paymentConfirmedMessage(loaded.data));
}

export async function sendOrderCanceledEmail(orderId: string, technicalReason: string): Promise<void> {
  const loaded = await loadOrderEmailData(orderId);
  if (!loaded) return;
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { paymentMethod: true } });
  const reason = publicCancelReason(order?.paymentMethod ?? "", technicalReason);
  await notifyCustomer(orderId, orderCanceledMessage(loaded.data, reason));
}

/** Prontos para a Etapa 9 chamar quando o lojista marcar o pedido como enviado ou entregue. */
export async function sendOrderShippedEmail(orderId: string, trackingCode: string | null, carrier: string | null): Promise<void> {
  const loaded = await loadOrderEmailData(orderId);
  if (!loaded) return;
  await notifyCustomer(orderId, orderShippedMessage(loaded.data, trackingCode, carrier));
}

export async function sendOrderDeliveredEmail(orderId: string): Promise<void> {
  const loaded = await loadOrderEmailData(orderId);
  if (!loaded) return;
  await notifyCustomer(orderId, orderDeliveredMessage(loaded.data));
}

async function notifyCustomer(orderId: string, message: { subject: string; html: string; text: string }): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { user: { select: { email: true } } } });
  if (!order) return;
  await sendEmailSafely({ to: order.user.email, ...message, idempotencyKey: `order-email/${orderId}/${message.subject}` });
}

/** E-mail de aviso para quem toma conta da loja: STORE_OWNER_EMAIL (se configurado) + qualquer usuário com papel ADMIN. */
export async function notifyAdminNewOrder(orderId: string): Promise<void> {
  const loaded = await loadOrderEmailData(orderId);
  if (!loaded) return;
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
  const recipients = new Set(admins.map((a) => a.email));
  if (process.env.STORE_OWNER_EMAIL) recipients.add(process.env.STORE_OWNER_EMAIL);
  if (recipients.size === 0) return; // ninguém para avisar ainda (nenhum admin criado ou e-mail configurado)

  const message = adminNewOrderMessage({ ...loaded.data, statusLabel: orderStatusLabel(loaded.status), adminUrl: `${siteUrl}/admin/pedidos/${orderId}` });
  for (const to of recipients) await sendEmailSafely({ to, ...message, idempotencyKey: `order-admin-email/${orderId}` });
}
