import type { Prisma } from "@prisma/client";
import { buildLines, computeCart, EMPTY_SUMMARY, evaluateCoupon, MAX_DISTINCT_ITEMS, MAX_QTY_PER_ITEM, type CartItemInput, type CartSummary } from "@/lib/cart";
import { hasDatabase } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

const cartInclude = {
  coupon: true,
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      variant: {
        include: {
          product: { select: { id: true, slug: true, name: true, active: true, brandId: true, brand: { select: { name: true } }, images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } } } },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartRow = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

const toItemInput = (item: CartRow["items"][number]): CartItemInput => {
  const v = item.variant;
  const p = v.product;
  return {
    id: item.id,
    variantId: v.id,
    productId: p.id,
    brandId: p.brandId,
    slug: p.slug,
    productName: p.name,
    brandName: p.brand.name,
    variantLabel: v.label,
    quantity: item.quantity,
    priceCents: v.priceCents,
    compareAtCents: v.compareAtCents,
    stockQty: v.stockQty,
    active: v.active && p.active,
    imageUrl: p.images[0]?.url ?? null,
    imageAlt: p.images[0]?.alt ?? null,
  };
};

/** Quantas vezes o cliente já usou o cupom em pedidos não cancelados. */
const countCouponUses = (userId: string, couponId: string) =>
  prisma.order.count({ where: { userId, couponId, status: { notIn: ["CANCELADO", "REEMBOLSADO"] } } });

const touchCart = (userId: string) => prisma.cart.updateMany({ where: { userId }, data: { updatedAt: new Date() } });

/** Carrinho já calculado (preço, estoque e cupom sempre atuais). Remove sozinho um cupom que deixou de valer. */
export async function getCartView(userId: string): Promise<CartSummary> {
  if (!hasDatabase) return EMPTY_SUMMARY;
  const cart = await prisma.cart.findUnique({ where: { userId }, include: cartInclude });
  if (!cart) return EMPTY_SUMMARY;

  const settings = await getSettings();
  const userUses = cart.coupon && cart.coupon.perUserLimit !== null ? await countCouponUses(userId, cart.coupon.id) : 0;
  const summary = computeCart(cart.items.map(toItemInput), cart.coupon, {
    now: new Date(),
    userUses,
    pixDiscountPercent: settings.pixDiscountPercent,
    freeShippingAboveCents: settings.freeShippingAboveCents,
  });
  if (cart.coupon && summary.couponError) await prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } });
  return summary;
}

export async function countCartUnits(userId: string): Promise<number> {
  if (!hasDatabase) return 0;
  const result = await prisma.cartItem.aggregate({ where: { cart: { userId } }, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}

export type AddResult = { ok: true; quantity: number; clamped: boolean } | { ok: false; reason: "UNAVAILABLE" | "OUT_OF_STOCK" | "CART_FULL" };

/** Soma ao que já está no carrinho, sem passar do estoque nem do limite por item. */
export async function addToCart(userId: string, variantId: string, quantity: number): Promise<AddResult> {
  return prisma.$transaction(async (tx): Promise<AddResult> => {
    const variant = await tx.productVariant.findFirst({ where: { id: variantId, active: true, product: { active: true } }, select: { id: true, stockQty: true } });
    if (!variant) return { ok: false, reason: "UNAVAILABLE" };
    if (variant.stockQty <= 0) return { ok: false, reason: "OUT_OF_STOCK" };

    const cart = await tx.cart.upsert({ where: { userId }, update: { updatedAt: new Date() }, create: { userId }, select: { id: true } });
    const existing = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } }, select: { id: true, quantity: true } });
    if (!existing && (await tx.cartItem.count({ where: { cartId: cart.id } })) >= MAX_DISTINCT_ITEMS) return { ok: false, reason: "CART_FULL" };

    const max = Math.min(variant.stockQty, MAX_QTY_PER_ITEM);
    const wanted = (existing?.quantity ?? 0) + quantity;
    const finalQty = Math.min(wanted, max);
    if (existing) await tx.cartItem.update({ where: { id: existing.id }, data: { quantity: finalQty } });
    else await tx.cartItem.create({ data: { cartId: cart.id, variantId, quantity: finalQty } });
    return { ok: true, quantity: finalQty, clamped: wanted > max };
  });
}

/** quantity <= 0 remove o item. Sempre filtra pelo dono do carrinho. */
export async function setQuantity(userId: string, itemId: string, quantity: number): Promise<{ ok: boolean }> {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    select: { id: true, variant: { select: { stockQty: true, active: true, product: { select: { active: true } } } } },
  });
  if (!item) return { ok: false };
  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    const max = item.variant.active && item.variant.product.active ? Math.min(item.variant.stockQty, MAX_QTY_PER_ITEM) : 0;
    if (max <= 0) return { ok: false };
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: Math.min(quantity, max) } });
  }
  await touchCart(userId);
  return { ok: true };
}

export async function removeItem(userId: string, itemId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { id: itemId, cart: { userId } } });
  await touchCart(userId);
}

/** Tira do carrinho o que saiu de linha ou esgotou. */
export async function clearUnavailable(userId: string): Promise<void> {
  await prisma.cartItem.deleteMany({
    where: { cart: { userId }, variant: { OR: [{ active: false }, { stockQty: { lte: 0 } }, { product: { active: false } }] } },
  });
  await touchCart(userId);
}

export type ApplyCouponResult = { ok: true; code: string } | { ok: false; message: string };

export async function applyCoupon(userId: string, code: string): Promise<ApplyCouponResult> {
  const cart = await prisma.cart.findUnique({ where: { userId }, include: cartInclude });
  if (!cart || cart.items.length === 0) return { ok: false, message: "Adicione produtos ao carrinho antes de aplicar um cupom." };

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) return { ok: false, message: "Cupom não encontrado. Confira o código digitado." };

  const uses = coupon.perUserLimit !== null ? await countCouponUses(userId, coupon.id) : 0;
  const result = evaluateCoupon(coupon, buildLines(cart.items.map(toItemInput)), new Date(), uses);
  if (!result.ok) return { ok: false, message: result.message };

  await prisma.cart.update({ where: { id: cart.id }, data: { couponId: coupon.id } });
  return { ok: true, code: coupon.code };
}

export async function removeCoupon(userId: string): Promise<void> {
  await prisma.cart.updateMany({ where: { userId }, data: { couponId: null } });
}
