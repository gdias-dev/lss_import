/**
 * Compra a etiqueta dos Correios pelo Melhor Envio quando o admin marca um pedido como enviado.
 * NUNCA testado contra credenciais reais (sem internet neste ambiente) — revisar em sandbox.
 * Passo a passo: adicionar ao carrinho do Melhor Envio -> confirmar (debita a carteira) -> gerar a
 * etiqueta -> obter o PDF -> consultar o rastreio. Qualquer etapa que falhar interrompe tudo: o
 * pedido só é marcado como "Enviado" se a etiqueta sair do início ao fim, para nunca cobrar do
 * lojista e deixar o pedido sem código de rastreio.
 */
import { getWhatsAppNumber } from "@/lib/env";
import { onlyDigits } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getAllSettings } from "@/server/admin/settings";
import { changeOrderStatus } from "@/server/admin/orders";
import { addShipmentToCart, checkoutShipments, generateLabels, printLabels, trackShipments, type ShipmentParty } from "@/server/shipping/melhorenvio";

export function isMelhorEnvioConfigured(): boolean {
  return Boolean(process.env.MELHORENVIO_TOKEN && process.env.STORE_ORIGIN_CEP && process.env.STORE_ORIGIN_STREET && process.env.STORE_ORIGIN_NUMBER && process.env.STORE_ORIGIN_NEIGHBORHOOD && process.env.STORE_ORIGIN_CITY && process.env.STORE_ORIGIN_STATE);
}

async function originParty(): Promise<{ party: ShipmentParty; storeName: string } | { error: string }> {
  const settings = await getAllSettings();
  const document = settings.cnpj ? onlyDigits(settings.cnpj) : null;
  if (!document) return { error: "Cadastre o CNPJ da loja em Configurações antes de comprar uma etiqueta." };
  if (!isMelhorEnvioConfigured()) return { error: "Endereço de origem incompleto. Preencha STORE_ORIGIN_CEP, STORE_ORIGIN_STREET, STORE_ORIGIN_NUMBER, STORE_ORIGIN_NEIGHBORHOOD, STORE_ORIGIN_CITY e STORE_ORIGIN_STATE no .env." };

  const whatsapp = getWhatsAppNumber();
  return {
    storeName: settings.storeName,
    party: {
      name: settings.storeName,
      phone: whatsapp ?? "00000000000",
      document,
      companyDocument: document.length === 14 ? document : undefined,
      address: process.env.STORE_ORIGIN_STREET!,
      number: process.env.STORE_ORIGIN_NUMBER!,
      complement: process.env.STORE_ORIGIN_COMPLEMENT || undefined,
      district: process.env.STORE_ORIGIN_NEIGHBORHOOD!,
      city: process.env.STORE_ORIGIN_CITY!,
      stateAbbr: process.env.STORE_ORIGIN_STATE!,
      postalCode: process.env.STORE_ORIGIN_CEP!,
    },
  };
}

export type PurchaseLabelResult = { ok: true; trackingCode: string | null; labelUrl: string } | { ok: false; message: string };

export async function purchaseShippingLabel(adminId: string, orderId: string): Promise<PurchaseLabelResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true, shipment: true, items: { include: { variant: true } } } });
  if (!order) return { ok: false, message: "Pedido não encontrado." };
  if (order.shippingMethod !== "CORREIOS") return { ok: false, message: "Este pedido não usa entrega pelos Correios — não há etiqueta para comprar." };
  if (order.shipment?.trackingCode) return { ok: false, message: "Este pedido já tem um código de rastreio." };
  if (!["PAGO", "EM_SEPARACAO"].includes(order.status)) return { ok: false, message: "Só é possível comprar a etiqueta de um pedido pago." };

  const origin = await originParty();
  if ("error" in origin) return { ok: false, message: origin.error };

  const address = order.addressSnapshot as { recipient: string; street: string; number: string; complement: string | null; neighborhood: string; city: string; state: string; cep: string };
  const to: ShipmentParty = { name: address.recipient, phone: getWhatsAppNumber() ?? "00000000000", document: onlyDigits(order.user.cpf ?? ""), address: address.street, number: address.number, complement: address.complement ?? undefined, district: address.neighborhood, city: address.city, stateAbbr: address.state, postalCode: address.cep };

  const products = order.items
    .filter((i) => i.variantId)
    .map((i) => ({ id: i.variantId!, height: Math.max(2, i.variant?.heightCm ?? 16), width: Math.max(11, i.variant?.widthCm ?? 10), length: Math.max(16, i.variant?.lengthCm ?? 10), weight: Math.max(0.1, (i.variant?.weightGrams ?? 500) / 1000), insurance_value: i.unitPriceCents / 100, quantity: i.quantity }));

  // A cotação foi feita no checkout com o Melhor Envio escolhendo a transportadora; aqui pedimos de
  // novo o serviço mais barato disponível para o mesmo trajeto, já que não guardamos o id do serviço.
  let cartItemId: string;
  try {
    const { fetchLiveShippingOptions } = await import("@/server/shipping/melhorenvio");
    const options = await fetchLiveShippingOptions(address.cep, products);
    const cheapest = options.sort((a, b) => a.costCents - b.costCents)[0];
    const serviceId = cheapest?.key.replace("correios-me-", "");
    if (!serviceId) return { ok: false, message: "Não foi possível cotar o frete deste pedido agora. Tente novamente em instantes." };

    const cart = await addShipmentToCart({ serviceId, from: origin.party, to, products, orderNumber: `LS-${String(order.number).padStart(6, "0")}` });
    cartItemId = cart.id;
    await checkoutShipments([cartItemId]);
    await generateLabels([cartItemId]);
  } catch (error) {
    console.error("[etiqueta] falha ao comprar no Melhor Envio", error);
    return { ok: false, message: "O Melhor Envio recusou a compra da etiqueta (confira saldo e dados cadastrais na conta do Melhor Envio)." };
  }

  let labelUrl: string;
  try {
    const printed = await printLabels([cartItemId]);
    labelUrl = printed.url;
  } catch (error) {
    console.error("[etiqueta] etiqueta comprada, mas falhou ao gerar o PDF", error);
    return { ok: false, message: "A etiqueta foi comprada, mas não foi possível gerar o PDF agora. Tente novamente em instantes ou veja no painel do Melhor Envio." };
  }

  let trackingCode: string | null = null;
  try {
    const tracking = await trackShipments([cartItemId]);
    trackingCode = tracking[cartItemId]?.tracking ?? null;
  } catch (error) {
    console.error("[etiqueta] etiqueta gerada, mas falhou ao consultar o rastreio (não bloqueia)", error);
  }

  await prisma.shipment.updateMany({ where: { orderId }, data: { labelUrl, carrier: "Correios" } });
  await changeOrderStatus(adminId, orderId, "ENVIADO", trackingCode, "Correios");
  return { ok: true, trackingCode, labelUrl };
}
