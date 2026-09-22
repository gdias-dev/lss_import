/**
 * E-mails de status do pedido. Reaproveitam o layout de src/server/emails/templates.ts.
 * Nunca colocam um texto técnico de erro no e-mail — o cliente só vê explicações amigáveis.
 */
import { formatCep } from "@/lib/cep";
import { formatBRL } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { formatOrderNumber } from "@/lib/whatsapp";
import { renderEmail } from "./templates";

export interface OrderEmailItem {
  productName: string;
  variantLabel: string;
  quantity: number;
  totalCents: number;
}

export interface OrderEmailAddress {
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
}

export interface OrderEmailData {
  orderNumber: number;
  customerName: string;
  items: OrderEmailItem[];
  totalCents: number;
  address: OrderEmailAddress;
  orderUrl: string;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
const orderTag = (n: number) => formatOrderNumber(n);

const itemLines = (items: OrderEmailItem[]) => items.map((i) => `${i.quantity}x ${i.productName} (${i.variantLabel}) — ${formatBRL(i.totalCents)}`);

const addressLine = (a: OrderEmailAddress) => `${a.street}, ${a.number}${a.complement ? ` - ${a.complement}` : ""}, ${a.neighborhood}, ${a.city}/${a.state}, CEP ${formatCep(a.cep)}`;

export function orderCardProcessingMessage(o: OrderEmailData) {
  return {
    subject: `Pedido ${orderTag(o.orderNumber)} em análise`,
    ...renderEmail({
      title: "Pagamento em análise",
      paragraphs: [`Olá, ${firstName(o.customerName)}! Recebemos o pedido ${orderTag(o.orderNumber)}, no valor de ${formatBRL(o.totalCents)}. A operadora do cartão está analisando o pagamento — isso pode levar alguns minutos.`, "Você recebe um novo e-mail assim que o pagamento for confirmado.", "Itens do pedido:", ...itemLines(o.items)],
      cta: { label: "Acompanhar pedido", url: o.orderUrl },
    }),
  };
}

export function orderPixPendingMessage(o: OrderEmailData, expiresAt: Date | null) {
  return {
    subject: `Falta pagar o Pix do pedido ${orderTag(o.orderNumber)}`,
    ...renderEmail({
      title: "Falta só o pagamento",
      paragraphs: [
        `Olá, ${firstName(o.customerName)}! Recebemos o seu pedido ${orderTag(o.orderNumber)}, no valor de ${formatBRL(o.totalCents)}.`,
        expiresAt ? `Pague com Pix até ${expiresAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} para garantir os produtos separados.` : "Pague com Pix para confirmar o pedido.",
        "Itens do pedido:",
        ...itemLines(o.items),
      ],
      cta: { label: "Pagar agora", url: o.orderUrl },
    }),
  };
}

export function orderCashOnDeliveryMessage(o: OrderEmailData) {
  return {
    subject: `Pedido ${orderTag(o.orderNumber)} confirmado — pagamento na entrega`,
    ...renderEmail({
      title: "Pedido confirmado",
      paragraphs: [`Olá, ${firstName(o.customerName)}! Seu pedido ${orderTag(o.orderNumber)} foi confirmado, no valor de ${formatBRL(o.totalCents)}, com pagamento na entrega.`, "Itens do pedido:", ...itemLines(o.items), `Entrega: ${addressLine(o.address)}`],
      cta: { label: "Acompanhar pedido", url: o.orderUrl },
    }),
  };
}

export function paymentConfirmedMessage(o: OrderEmailData) {
  return {
    subject: `Pagamento confirmado — pedido ${orderTag(o.orderNumber)}`,
    ...renderEmail({
      title: "Pagamento confirmado!",
      paragraphs: [`Olá, ${firstName(o.customerName)}! Recebemos o pagamento do pedido ${orderTag(o.orderNumber)}, no valor de ${formatBRL(o.totalCents)}. Já vamos preparar tudo com cuidado.`, "Itens do pedido:", ...itemLines(o.items), `Entrega: ${addressLine(o.address)}`],
      cta: { label: "Acompanhar pedido", url: o.orderUrl },
    }),
  };
}

/** `publicReason` é sempre um texto amigável — nunca a mensagem técnica de erro do gateway. */
export function orderCanceledMessage(o: OrderEmailData, publicReason: string) {
  return {
    subject: `Pedido ${orderTag(o.orderNumber)} cancelado`,
    ...renderEmail({
      title: "Pedido cancelado",
      paragraphs: [`Olá, ${firstName(o.customerName)}. Seu pedido ${orderTag(o.orderNumber)} foi cancelado: ${publicReason}`, "Nenhum valor foi cobrado. Se quiser, você pode fazer um novo pedido quando preferir."],
      cta: { label: "Ver perfumes", url: o.orderUrl.replace(/\/conta\/pedidos\/.*$/, "/perfumes").replace(/\/pedido\/.*$/, "/perfumes") },
    }),
  };
}

export function orderShippedMessage(o: OrderEmailData, trackingCode: string | null, carrier: string | null) {
  return {
    subject: `Pedido ${orderTag(o.orderNumber)} enviado`,
    ...renderEmail({
      title: "Seu pedido foi enviado!",
      paragraphs: [
        `Olá, ${firstName(o.customerName)}! O pedido ${orderTag(o.orderNumber)} já está a caminho${carrier ? ` pelos ${carrier}` : ""}.`,
        ...(trackingCode ? [`Código de rastreio: ${trackingCode}`] : []),
        `Entrega: ${addressLine(o.address)}`,
      ],
      cta: { label: "Acompanhar pedido", url: o.orderUrl },
    }),
  };
}

export function orderDeliveredMessage(o: OrderEmailData) {
  return {
    subject: `Pedido ${orderTag(o.orderNumber)} entregue`,
    ...renderEmail({
      title: "Pedido entregue!",
      paragraphs: [`Olá, ${firstName(o.customerName)}! Nosso registro mostra que o pedido ${orderTag(o.orderNumber)} foi entregue. Esperamos que você ame o seu novo perfume!`, "Se puder, deixe uma avaliação — isso ajuda muito outros clientes."],
      cta: { label: "Avaliar produtos", url: o.orderUrl },
    }),
  };
}

export function adminNewOrderMessage(o: OrderEmailData & { statusLabel: string; adminUrl: string }) {
  return {
    subject: `Novo pedido ${orderTag(o.orderNumber)} — ${formatBRL(o.totalCents)}`,
    ...renderEmail({
      title: "Novo pedido recebido",
      paragraphs: [`Pedido ${orderTag(o.orderNumber)} de ${o.customerName}, no valor de ${formatBRL(o.totalCents)}. Status: ${o.statusLabel}.`, "Itens:", ...itemLines(o.items), `Entrega: ${addressLine(o.address)}`],
      cta: { label: "Ver pedido", url: o.adminUrl },
      footer: "Você recebeu este e-mail porque é responsável pela loja LS Imports.",
    }),
  };
}

export const orderStatusLabel = (status: string) => ORDER_STATUS_LABEL[status] ?? status;
