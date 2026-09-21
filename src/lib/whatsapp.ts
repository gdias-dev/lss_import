import { formatBRL } from "./money";
import { onlyDigits } from "./utils";

export function buildWhatsAppLink(number: string, text?: string): string {
  const base = `https://wa.me/${onlyDigits(number)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export const formatOrderNumber = (n: number) => `LS-${String(n).padStart(6, "0")}`;

export interface WhatsAppOrder {
  number: number;
  customerName: string;
  items: { name: string; variantLabel: string; quantity: number; totalCents: number }[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  interestCents?: number;
  totalCents: number;
  couponCode?: string | null;
  shippingLabel: string;
  paymentLabel: string;
  addressLine: string;
  orderUrl: string;
}

/** Mensagem do pedido para o WhatsApp da loja. Mantém o tamanho abaixo do limite seguro de URL. */
export function buildOrderWhatsAppMessage(o: WhatsAppOrder, maxLength = 1800): string {
  const itemLine = (i: WhatsAppOrder["items"][number]) =>
    `- ${i.quantity}x ${i.name} (${i.variantLabel}) — ${formatBRL(i.totalCents)}`;

  const compose = (itemLines: string[]) =>
    [
      `Olá! Acabei de fazer o pedido #${formatOrderNumber(o.number)} no site.`,
      "",
      `*Cliente:* ${o.customerName}`,
      "*Itens:*",
      ...itemLines,
      `*Subtotal:* ${formatBRL(o.subtotalCents)}`,
      `*Frete (${o.shippingLabel}):* ${formatBRL(o.shippingCents)}`,
      ...(o.discountCents > 0 ? [`*Desconto${o.couponCode ? ` (cupom ${o.couponCode})` : ""}:* -${formatBRL(o.discountCents)}`] : []),
      ...(o.interestCents && o.interestCents > 0 ? [`*Juros do parcelamento:* ${formatBRL(o.interestCents)}`] : []),
      `*Total:* ${formatBRL(o.totalCents)}`,
      `*Pagamento:* ${o.paymentLabel}`,
      `*Entrega:* ${o.addressLine}`,
      "",
      `Acompanhar pedido: ${o.orderUrl}`,
    ].join("\n");

  let lines = o.items.map(itemLine);
  let text = compose(lines);
  while (text.length > maxLength && lines.length > 1) {
    lines = lines.slice(0, -1);
    const hidden = o.items.length - lines.length;
    text = compose([...lines, `- ...e mais ${hidden} item(ns), veja no link do pedido`]);
  }
  return text;
}
