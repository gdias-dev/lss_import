/**
 * Núcleo do checkout: recalcula TUDO no servidor (nunca confia em preço, frete ou desconto vindo do
 * cliente), reserva o estoque de forma atômica e cria o pedido. Chamado pela Server Action de
 * src/app/checkout/actions.ts, que cuida de autenticação, validação de formato e limite de tentativas.
 */
import { OrderStatus, PaymentStatus, Prisma, type PaymentMethod } from "@prisma/client";
import { buildInstallments, formatBRL, percentOf } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { installmentRules, getSettings, type StoreSettings } from "@/lib/settings";
import { buildShippingOptions, findShippingOption, type ShippingOption } from "@/lib/shipping";
import { getCartView } from "./cart";
import { getPaymentProvider, PaymentProviderError, type Payer } from "./payments";

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

// ------------------------------------------------------------ contexto (dados para montar a tela)

export async function getCheckoutAddresses(userId: string) {
  return prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
}

async function loadActiveZones() {
  const zones = await prisma.deliveryZone.findMany({ where: { active: true }, include: { ranges: true } });
  return zones.map((z) => ({ id: z.id, name: z.name, feeCents: z.feeCents, freeAboveCents: z.freeAboveCents, neighborhoods: z.neighborhoods, allowsPayOnDelivery: z.allowsPayOnDelivery, estimatedDays: z.estimatedDays, ranges: z.ranges }));
}

async function cartWeightGrams(userId: string): Promise<number> {
  const items = await prisma.cartItem.findMany({ where: { cart: { userId } }, select: { quantity: true, variant: { select: { weightGrams: true } } } });
  return items.reduce((sum, i) => sum + i.variant.weightGrams * i.quantity, 0);
}

/** Opções de frete para um endereço específico do cliente (usado tanto pela tela quanto pela criação do pedido). */
export async function getShippingOptionsForAddress(userId: string, addressId: string): Promise<{ options: ShippingOption[]; address: NonNullable<Awaited<ReturnType<typeof prisma.address.findFirst>>> } | null> {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) return null;

  const [cart, settings, zones, weightGrams] = await Promise.all([getCartView(userId), getSettings(), loadActiveZones(), cartWeightGrams(userId)]);
  const options = buildShippingOptions({
    cep: address.cep,
    neighborhood: address.neighborhood,
    weightGrams,
    zones,
    pickupEnabled: settings.pickupEnabled,
    subtotalCentsForFreeShipping: cart.totalCents,
    globalFreeShipping: Boolean(cart.freeShipping?.reached),
  });
  return { options, address };
}

// ------------------------------------------------------------ criação do pedido

export interface PlaceOrderInput {
  addressId: string;
  shippingKey: string;
  paymentMethod: PaymentMethod;
  cpf?: string;
  customerNote?: string;
  cardToken?: string;
  cardPaymentMethodId?: string;
  cardIssuerId?: string;
  installments?: number;
  changeForCents?: number;
}

export interface PlaceOrderResult {
  orderId: string;
  orderNumber: number;
  status: OrderStatus;
  pix: { qrCode: string | null; qrCodeBase64: string | null; expiresAt: string | null } | null;
  cardDeclined: boolean;
}

const paymentDescription = (orderNumber: number) => `Pedido LS-${String(orderNumber).padStart(6, "0")} — LS Imports`;

export async function placeOrder(userId: string, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, cpf: true } });
  if (!user) throw new CheckoutError("Usuário não encontrado.");

  const cpf = user.cpf ?? input.cpf ?? null;
  if (!cpf) throw new CheckoutError("Informe o CPF para continuar.");
  if (!user.cpf) await prisma.user.update({ where: { id: user.id }, data: { cpf } }).catch(() => undefined); // CPF é @unique; se já pertence a outra conta, seguimos sem travar o pedido

  const settings = await getSettings();
  const shipping = await getShippingOptionsForAddress(userId, input.addressId);
  if (!shipping) throw new CheckoutError("Endereço não encontrado.");
  const option = findShippingOption(shipping.options, input.shippingKey);
  if (!option) throw new CheckoutError("Escolha uma forma de entrega válida.");

  if (input.paymentMethod === "DEBIT_CARD" && !settings.debitEnabled) throw new CheckoutError("Pagamento com débito não está disponível no momento.");
  if ((input.paymentMethod === "CASH_ON_DELIVERY" || input.paymentMethod === "CARD_ON_DELIVERY") && !option.allowsPayOnDelivery) {
    throw new CheckoutError("Pagamento na entrega não está disponível para este endereço.");
  }

  const cart = await getCartView(userId);
  if (!cart.canCheckout) throw new CheckoutError("Seu carrinho tem itens indisponíveis. Volte ao carrinho para ajustar.");

  const isCard = input.paymentMethod === "CREDIT_CARD" || input.paymentMethod === "DEBIT_CARD";
  const installments = isCard ? Math.max(1, input.installments ?? 1) : 1;
  let interestCents = 0;
  if (isCard && installments > 1) {
    const plan = buildInstallments(cart.totalCents, installmentRules(settings)).find((p) => p.count === installments);
    if (!plan) throw new CheckoutError("Número de parcelas inválido para este valor.");
    interestCents = plan.interestCents;
  }
  // O desconto do Pix já está calculado em cart.pix; para os demais métodos, o valor cheio dos produtos vale.
  const productsCents = input.paymentMethod === "PIX" && cart.pix ? cart.pix.totalCents : cart.totalCents;
  const totalCents = productsCents + option.costCents + interestCents;

  const changeForCents = input.paymentMethod === "CASH_ON_DELIVERY" ? (input.changeForCents ?? 0) : null;
  if (changeForCents !== null && changeForCents > 0 && changeForCents < totalCents) throw new CheckoutError("O valor para troco precisa ser maior ou igual ao total do pedido.");

  const addressSnapshot = {
    recipient: shipping.address.recipient,
    cep: shipping.address.cep,
    street: shipping.address.street,
    number: shipping.address.number,
    complement: shipping.address.complement,
    neighborhood: shipping.address.neighborhood,
    city: shipping.address.city,
    state: shipping.address.state,
  };

  const initialStatus: OrderStatus = input.paymentMethod === "CASH_ON_DELIVERY" || input.paymentMethod === "CARD_ON_DELIVERY" ? OrderStatus.AGUARDANDO_PAGAMENTO_NA_ENTREGA : OrderStatus.AGUARDANDO_PAGAMENTO;
  const reservedUntil = initialStatus === OrderStatus.AGUARDANDO_PAGAMENTO ? new Date(Date.now() + settings.pixExpirationMinutes * 60_000) : null;

  // ---- Transação A: reserva o estoque, cria o pedido e esvazia o carrinho. Nenhuma chamada de rede aqui dentro. ----
  const created = await prisma.$transaction(async (tx) => {
    const dbCart = await tx.cart.findUnique({ where: { userId }, include: { items: { include: { variant: true } } } });
    if (!dbCart || dbCart.items.length === 0) throw new CheckoutError("Seu carrinho está vazio.");

    for (const item of dbCart.items) {
      const result = await tx.productVariant.updateMany({ where: { id: item.variantId, stockQty: { gte: item.quantity } }, data: { stockQty: { decrement: item.quantity } } });
      if (result.count !== 1) throw new CheckoutError(`O produto "${item.variant.label}" não tem mais estoque suficiente. Volte ao carrinho para ajustar a quantidade.`);
      await tx.stockMovement.create({ data: { variantId: item.variantId, delta: -item.quantity, reason: "SALE" } });
    }

    let couponStillValid = true;
    if (dbCart.couponId) {
      // Incremento atômico e condicional: sem limite (maxUses null) sempre soma; com limite, só soma se ainda houver vaga.
      // Prisma não expressa "campo < outro campo" em updateMany, por isso o SQL bruto (ainda dentro da mesma transação).
      const bumped = await tx.$executeRaw`
        UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
        WHERE id = ${dbCart.couponId} AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;
      couponStillValid = bumped === 1;
      if (!couponStillValid) throw new CheckoutError("Este cupom acabou de esgotar. Remova-o do carrinho e tente novamente.");
    }

    const order = await tx.order.create({
      data: {
        userId,
        status: initialStatus,
        subtotalCents: cart.subtotalCents,
        discountCents: cart.discountCents,
        shippingCents: option.costCents,
        interestCents,
        totalCents,
        couponId: cart.coupon ? dbCart.couponId : null,
        couponCode: cart.coupon?.code ?? null,
        paymentMethod: input.paymentMethod,
        shippingMethod: option.method,
        addressSnapshot: addressSnapshot as Prisma.InputJsonValue,
        customerNote: input.customerNote || null,
        changeForCents,
        reservedUntil,
        items: {
          create: dbCart.items.map((item) => ({
            variantId: item.variantId,
            productName: cart.lines.find((l) => l.id === item.id)?.productName ?? item.variant.label,
            variantLabel: item.variant.label,
            sku: item.variant.sku,
            unitPriceCents: item.variant.priceCents,
            quantity: item.quantity,
            totalCents: item.variant.priceCents * item.quantity,
          })),
        },
        shipment: { create: { method: option.method, service: option.service, costCents: option.costCents, estimatedDays: option.etaDays, carrier: option.method === "CORREIOS" ? "Correios" : null } },
      },
      select: { id: true, number: true },
    });

    await tx.cartItem.deleteMany({ where: { cartId: dbCart.id } });
    await tx.cart.update({ where: { id: dbCart.id }, data: { couponId: null } });

    return order;
  });

  // ---- Pagamento (fora da transação: nunca segurar o banco travado esperando uma chamada de rede) ----
  if (initialStatus === OrderStatus.AGUARDANDO_PAGAMENTO_NA_ENTREGA) {
    await prisma.payment.create({ data: { orderId: created.id, provider: "manual", method: input.paymentMethod, status: PaymentStatus.PENDING, amountCents: totalCents, idempotencyKey: `manual/${created.id}` } });
    return { orderId: created.id, orderNumber: created.number, status: initialStatus, pix: null, cardDeclined: false };
  }

  const payer: Payer = { email: user.email, firstName: user.name.split(/\s+/)[0] ?? user.name, lastName: user.name.split(/\s+/).slice(1).join(" ") || user.name, cpf };
  const provider = getPaymentProvider();

  if (input.paymentMethod === "PIX") {
    try {
      const pix = await provider.createPixPayment({ idempotencyKey: `pix/${created.id}`, amountCents: totalCents, description: paymentDescription(created.number), payer, externalReference: created.id, expirationMinutes: settings.pixExpirationMinutes });
      await prisma.payment.create({
        data: { orderId: created.id, provider: provider.name, providerPaymentId: pix.providerPaymentId, method: "PIX", status: "PENDING", amountCents: totalCents, pixQrCode: pix.qrCode, pixCopyPaste: pix.qrCode, expiresAt: pix.expiresAt, rawPayload: pix.raw as Prisma.InputJsonValue, idempotencyKey: `pix/${created.id}` },
      });
      return { orderId: created.id, orderNumber: created.number, status: initialStatus, pix: { qrCode: pix.qrCode, qrCodeBase64: pix.qrCodeBase64, expiresAt: pix.expiresAt?.toISOString() ?? null }, cardDeclined: false };
    } catch (error) {
      await cancelAndRestoreStock(created.id, "Falha ao gerar o Pix no gateway de pagamento.");
      throw new CheckoutError(error instanceof PaymentProviderError ? error.message : "Não foi possível gerar o Pix agora. Tente novamente em instantes.");
    }
  }

  // Cartão (crédito ou débito)
  if (!input.cardToken || !input.cardPaymentMethodId) {
    await cancelAndRestoreStock(created.id, "Dados do cartão ausentes.");
    throw new CheckoutError("Dados do cartão incompletos.");
  }
  try {
    const card = await provider.createCardPayment({
      idempotencyKey: `card/${created.id}`,
      amountCents: totalCents,
      description: paymentDescription(created.number),
      payer,
      externalReference: created.id,
      token: input.cardToken,
      installments,
      paymentMethodId: input.cardPaymentMethodId,
      issuerId: input.cardIssuerId ?? null,
    });
    await prisma.payment.create({
      data: { orderId: created.id, provider: provider.name, providerPaymentId: card.providerPaymentId, method: input.paymentMethod, status: card.status === "APPROVED" ? "PAID" : card.status === "REJECTED" ? "FAILED" : "PENDING", installments, amountCents: totalCents, interestCents, paidAt: card.status === "APPROVED" ? new Date() : null, rawPayload: card.raw as Prisma.InputJsonValue, idempotencyKey: `card/${created.id}` },
    });

    if (card.status === "APPROVED") {
      await prisma.order.update({ where: { id: created.id }, data: { status: "PAGO", paidAt: new Date() } });
      return { orderId: created.id, orderNumber: created.number, status: "PAGO", pix: null, cardDeclined: false };
    }
    if (card.status === "REJECTED" || card.status === "CANCELED") {
      await cancelAndRestoreStock(created.id, `Pagamento recusado pela operadora (${card.statusDetail || "sem detalhe"}).`, false);
      return { orderId: created.id, orderNumber: created.number, status: "CANCELADO", pix: null, cardDeclined: true };
    }
    // PENDING (ex.: "in_process"): fica aguardando o webhook confirmar.
    return { orderId: created.id, orderNumber: created.number, status: initialStatus, pix: null, cardDeclined: false };
  } catch (error) {
    await cancelAndRestoreStock(created.id, "Falha ao processar o cartão no gateway de pagamento.");
    throw new CheckoutError(error instanceof PaymentProviderError ? error.message : "Não foi possível processar o cartão agora. Tente novamente ou escolha outra forma de pagamento.");
  }
}

// ------------------------------------------------------------ cancelamento com devolução de estoque

/**
 * Cancela um pedido e devolve o estoque reservado. `keepPaymentRecord=false` (padrão) porque, nesses
 * casos, ainda não existe um registro de Payment para o pedido — ele é criado depois, já com o status final.
 */
export async function cancelAndRestoreStock(orderId: string, reason: string, alsoDeletePayments = true): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, select: { id: true, status: true, couponId: true, items: { select: { variantId: true, quantity: true } } } });
    if (!order || order.status === "CANCELADO" || order.status === "REEMBOLSADO") return;

    for (const item of order.items) {
      if (!item.variantId) continue;
      await tx.productVariant.update({ where: { id: item.variantId }, data: { stockQty: { increment: item.quantity } } });
      await tx.stockMovement.create({ data: { variantId: item.variantId, delta: item.quantity, reason: "CANCEL", orderId, note: reason } });
    }
    if (order.couponId) await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { decrement: 1 } } }).catch(() => undefined);
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELADO", canceledAt: new Date() } });
    if (alsoDeletePayments) await tx.payment.deleteMany({ where: { orderId, status: "PENDING" } });
  });
}

// ------------------------------------------------------------ conciliação (webhook e checagem manual)

/** Usado pelo webhook do Mercado Pago e pela checagem manual da tela de confirmação (polling). Idempotente. */
export async function reconcilePayment(providerPaymentId: string): Promise<void> {
  const payment = await prisma.payment.findFirst({ where: { providerPaymentId }, include: { order: true } });
  if (!payment || payment.status === "PAID" || payment.status === "REFUNDED") return; // já resolvido, nada a fazer

  const provider = getPaymentProvider();
  const result = await provider.getPaymentStatus(providerPaymentId);

  if (result.status === "APPROVED") {
    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: "PAID", paidAt: new Date(), rawPayload: result.raw as Prisma.InputJsonValue } }),
      prisma.order.update({ where: { id: payment.orderId }, data: { status: "PAGO", paidAt: new Date() } }),
    ]);
    return;
  }
  if (result.status === "REJECTED" || result.status === "CANCELED") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: result.status === "REJECTED" ? "FAILED" : "CANCELED", rawPayload: result.raw as Prisma.InputJsonValue } });
    await cancelAndRestoreStock(payment.orderId, `Gateway retornou ${result.status.toLowerCase()} (${result.statusDetail}).`, false);
    return;
  }
  // continua pendente: nada a fazer além de guardar o payload mais recente
  await prisma.payment.update({ where: { id: payment.id }, data: { rawPayload: result.raw as Prisma.InputJsonValue } });
}

/** Libera pedidos de Pix cujo prazo venceu sem pagamento. Chamado pelo cron e pode ser chamado à mão. */
export async function releaseExpiredReservations(limit = 200): Promise<number> {
  const expired = await prisma.order.findMany({ where: { status: "AGUARDANDO_PAGAMENTO", reservedUntil: { lt: new Date() } }, select: { id: true }, take: limit });
  for (const o of expired) {
    await prisma.payment.updateMany({ where: { orderId: o.id, status: "PENDING" }, data: { status: "EXPIRED" } });
    await cancelAndRestoreStock(o.id, "Prazo de pagamento do Pix expirou.", false);
  }
  return expired.length;
}
