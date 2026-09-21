/**
 * Regras puras do carrinho e dos cupons (sem banco). O carrinho guarda só variação e quantidade:
 * preço, estoque e cupom são SEMPRE recalculados na hora de mostrar e na hora de pagar.
 */
import { formatBRL, percentOf } from "./money";

export const MAX_QTY_PER_ITEM = 10;
export const MAX_DISTINCT_ITEMS = 30;

export interface CartItemInput {
  id: string; // id do CartItem
  variantId: string;
  productId: string;
  brandId: string;
  slug: string;
  productName: string;
  brandName: string;
  variantLabel: string;
  quantity: number;
  priceCents: number;
  compareAtCents: number | null;
  stockQty: number;
  active: boolean; // variação E produto ativos
  imageUrl: string | null;
  imageAlt: string | null;
}

export type LineIssue = "UNAVAILABLE" | "OUT_OF_STOCK" | "REDUCED";

export interface CartLine extends CartItemInput {
  available: boolean;
  maxQty: number;
  effectiveQty: number;
  lineTotalCents: number;
  issue: LineIssue | null;
}

export function buildLines(items: CartItemInput[]): CartLine[] {
  return items.map((i) => {
    const maxQty = i.active ? Math.max(0, Math.min(i.stockQty, MAX_QTY_PER_ITEM)) : 0;
    const available = maxQty > 0;
    const effectiveQty = available ? Math.min(Math.max(i.quantity, 1), maxQty) : 0;
    const issue: LineIssue | null = !i.active ? "UNAVAILABLE" : i.stockQty <= 0 ? "OUT_OF_STOCK" : i.quantity > effectiveQty ? "REDUCED" : null;
    return { ...i, available, maxQty, effectiveQty, lineTotalCents: i.priceCents * effectiveQty, issue };
  });
}

// ------------------------------------------------------------ cupons

export type CouponType = "PERCENT" | "FIXED" | "FREE_SHIPPING";

export interface CouponInput {
  id: string;
  code: string;
  type: CouponType;
  value: number; // PERCENT: 10 = 10%; FIXED: centavos
  minSubtotalCents: number;
  maxUses: number | null;
  usedCount: number;
  perUserLimit: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
  brandId: string | null;
  productId: string | null;
}

export type CouponFailure = "INACTIVE" | "NOT_STARTED" | "EXPIRED" | "EXHAUSTED" | "USER_LIMIT" | "NOT_ELIGIBLE" | "MIN_SUBTOTAL";

export type CouponResult =
  | { ok: true; discountCents: number; freeShipping: boolean; eligibleSubtotalCents: number }
  | { ok: false; error: CouponFailure; message: string };

/** Confere um cupom contra o carrinho. `userUses` = pedidos anteriores do cliente com este cupom (não cancelados). */
export function evaluateCoupon(coupon: CouponInput, lines: CartLine[], now: Date, userUses: number): CouponResult {
  const fail = (error: CouponFailure, message: string): CouponResult => ({ ok: false, error, message });

  if (!coupon.active) return fail("INACTIVE", "Este cupom não está mais ativo.");
  if (coupon.startsAt && coupon.startsAt > now) return fail("NOT_STARTED", "Este cupom ainda não está valendo.");
  if (coupon.endsAt && coupon.endsAt <= now) return fail("EXPIRED", "Este cupom expirou.");
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return fail("EXHAUSTED", "Este cupom atingiu o limite de usos.");
  if (coupon.perUserLimit !== null && userUses >= coupon.perUserLimit) return fail("USER_LIMIT", "Você já usou este cupom o máximo de vezes permitido.");

  const restricted = Boolean(coupon.brandId || coupon.productId);
  const eligible = lines.filter((l) => l.available && (!coupon.brandId || l.brandId === coupon.brandId) && (!coupon.productId || l.productId === coupon.productId));
  const eligibleSubtotalCents = eligible.reduce((sum, l) => sum + l.lineTotalCents, 0);

  if (eligible.length === 0) {
    return fail("NOT_ELIGIBLE", restricted ? "Este cupom não vale para os produtos do seu carrinho." : "Adicione produtos disponíveis ao carrinho para usar o cupom.");
  }
  if (eligibleSubtotalCents < coupon.minSubtotalCents) {
    return fail("MIN_SUBTOTAL", `Este cupom vale para compras a partir de ${formatBRL(coupon.minSubtotalCents)}${restricted ? " nos produtos elegíveis" : ""}.`);
  }

  const discountCents =
    coupon.type === "PERCENT" ? percentOf(eligibleSubtotalCents, coupon.value) : coupon.type === "FIXED" ? Math.min(Math.max(coupon.value, 0), eligibleSubtotalCents) : 0;
  return { ok: true, discountCents, freeShipping: coupon.type === "FREE_SHIPPING", eligibleSubtotalCents };
}

// ------------------------------------------------------------ resumo

export interface CartContext {
  now: Date;
  userUses: number;
  pixDiscountPercent: number;
  freeShippingAboveCents: number; // 0 = desligado
}

export interface CartSummary {
  lines: CartLine[];
  itemCount: number;
  subtotalCents: number;
  discountCents: number;
  /** Produtos depois do cupom, sem frete. */
  totalCents: number;
  coupon: { code: string; type: CouponType; discountCents: number; freeShipping: boolean } | null;
  /** Havia cupom no carrinho, mas ele deixou de valer. Quem chama deve removê-lo. */
  couponError: string | null;
  /** Desconto do Pix vale sobre os produtos depois do cupom, nunca sobre o frete. */
  pix: { discountPercent: number; discountCents: number; totalCents: number } | null;
  freeShipping: { thresholdCents: number; missingCents: number; reached: boolean; byCoupon: boolean } | null;
  hasBlockingIssues: boolean;
  canCheckout: boolean;
}

export const EMPTY_SUMMARY: CartSummary = {
  lines: [],
  itemCount: 0,
  subtotalCents: 0,
  discountCents: 0,
  totalCents: 0,
  coupon: null,
  couponError: null,
  pix: null,
  freeShipping: null,
  hasBlockingIssues: false,
  canCheckout: false,
};

export function computeCart(items: CartItemInput[], coupon: CouponInput | null, ctx: CartContext): CartSummary {
  const lines = buildLines(items);
  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.effectiveQty, 0);

  let discountCents = 0;
  let applied: CartSummary["coupon"] = null;
  let couponError: string | null = null;
  if (coupon) {
    const result = evaluateCoupon(coupon, lines, ctx.now, ctx.userUses);
    if (result.ok) {
      discountCents = result.discountCents;
      applied = { code: coupon.code, type: coupon.type, discountCents, freeShipping: result.freeShipping };
    } else {
      couponError = result.message;
    }
  }

  const totalCents = Math.max(0, subtotalCents - discountCents);
  const pixDiscount = ctx.pixDiscountPercent > 0 ? percentOf(totalCents, ctx.pixDiscountPercent) : 0;
  const hasBlockingIssues = lines.some((l) => l.issue === "UNAVAILABLE" || l.issue === "OUT_OF_STOCK");

  let freeShipping: CartSummary["freeShipping"] = null;
  if (applied?.freeShipping) freeShipping = { thresholdCents: 0, missingCents: 0, reached: true, byCoupon: true };
  else if (ctx.freeShippingAboveCents > 0) {
    const missingCents = Math.max(0, ctx.freeShippingAboveCents - totalCents);
    freeShipping = { thresholdCents: ctx.freeShippingAboveCents, missingCents, reached: missingCents === 0 && itemCount > 0, byCoupon: false };
  }

  return {
    lines,
    itemCount,
    subtotalCents,
    discountCents,
    totalCents,
    coupon: applied,
    couponError,
    pix: pixDiscount > 0 ? { discountPercent: ctx.pixDiscountPercent, discountCents: pixDiscount, totalCents: totalCents - pixDiscount } : null,
    freeShipping,
    hasBlockingIssues,
    canCheckout: itemCount > 0 && !hasBlockingIssues,
  };
}

export const normalizeCouponCode = (input: string): string | null => {
  const code = input.trim().toUpperCase();
  return /^[A-Z0-9_-]{3,30}$/.test(code) ? code : null;
};
