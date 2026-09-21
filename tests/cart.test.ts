import { describe, expect, it } from "vitest";
import { buildLines, computeCart, evaluateCoupon, MAX_QTY_PER_ITEM, normalizeCouponCode, type CartContext, type CartItemInput, type CouponInput } from "@/lib/cart";

const item = (over: Partial<CartItemInput> = {}): CartItemInput => ({
  id: "i1", variantId: "v1", productId: "p1", brandId: "b1", slug: "elan-noir", productName: "Élan Noir", brandName: "Maison Élan", variantLabel: "100 ml",
  quantity: 1, priceCents: 20000, compareAtCents: null, stockQty: 5, active: true, imageUrl: null, imageAlt: null, ...over,
});

const coupon = (over: Partial<CouponInput> = {}): CouponInput => ({
  id: "c1", code: "BEMVINDO10", type: "PERCENT", value: 10, minSubtotalCents: 0, maxUses: null, usedCount: 0, perUserLimit: null,
  startsAt: null, endsAt: null, active: true, brandId: null, productId: null, ...over,
});

const now = new Date("2026-09-21T12:00:00Z");
const ctx = (over: Partial<CartContext> = {}): CartContext => ({ now, userUses: 0, pixDiscountPercent: 0, freeShippingAboveCents: 0, ...over });

describe("linhas do carrinho", () => {
  it("respeita estoque e o limite por item", () => {
    const [a, b, c, d] = buildLines([
      item({ quantity: 3, stockQty: 5 }),
      item({ id: "i2", quantity: 8, stockQty: 3 }), // pediu mais do que tem
      item({ id: "i3", quantity: 2, stockQty: 0 }),
      item({ id: "i4", quantity: 2, active: false }),
    ]);
    expect(a).toMatchObject({ effectiveQty: 3, lineTotalCents: 60000, issue: null });
    expect(b).toMatchObject({ effectiveQty: 3, issue: "REDUCED", maxQty: 3 });
    expect(c).toMatchObject({ effectiveQty: 0, lineTotalCents: 0, issue: "OUT_OF_STOCK", available: false });
    expect(d).toMatchObject({ effectiveQty: 0, issue: "UNAVAILABLE" });
    expect(buildLines([item({ quantity: 50, stockQty: 99 })])[0]?.effectiveQty).toBe(MAX_QTY_PER_ITEM);
  });
});

describe("cupons", () => {
  const lines = buildLines([item({ quantity: 2 })]); // R$ 400

  it("percentual e valor fixo (limitado ao subtotal)", () => {
    expect(evaluateCoupon(coupon(), lines, now, 0)).toMatchObject({ ok: true, discountCents: 4000 });
    expect(evaluateCoupon(coupon({ type: "FIXED", value: 2500 }), lines, now, 0)).toMatchObject({ ok: true, discountCents: 2500 });
    expect(evaluateCoupon(coupon({ type: "FIXED", value: 999_999 }), lines, now, 0)).toMatchObject({ ok: true, discountCents: 40000 });
    expect(evaluateCoupon(coupon({ type: "FREE_SHIPPING", value: 0 }), lines, now, 0)).toMatchObject({ ok: true, discountCents: 0, freeShipping: true });
  });

  it("recusa cupom inativo, fora da data, esgotado ou já usado", () => {
    const err = (c: CouponInput, uses = 0) => { const r = evaluateCoupon(c, lines, now, uses); return r.ok ? "ok" : r.error; };
    expect(err(coupon({ active: false }))).toBe("INACTIVE");
    expect(err(coupon({ startsAt: new Date("2026-10-01") }))).toBe("NOT_STARTED");
    expect(err(coupon({ endsAt: new Date("2026-09-01") }))).toBe("EXPIRED");
    expect(err(coupon({ endsAt: now }))).toBe("EXPIRED"); // vence no instante exato
    expect(err(coupon({ maxUses: 5, usedCount: 5 }))).toBe("EXHAUSTED");
    expect(err(coupon({ maxUses: 5, usedCount: 4 }))).toBe("ok");
    expect(err(coupon({ perUserLimit: 1 }), 1)).toBe("USER_LIMIT");
    expect(err(coupon({ perUserLimit: 2 }), 1)).toBe("ok");
  });

  it("valor mínimo e restrição por marca ou produto valem só para os itens elegíveis", () => {
    const r = evaluateCoupon(coupon({ minSubtotalCents: 50000 }), lines, now, 0);
    expect(r).toMatchObject({ ok: false, error: "MIN_SUBTOTAL" });
    if (!r.ok) expect(r.message).toMatch(/500,00/);

    const mixed = buildLines([item({ quantity: 1 }), item({ id: "i2", brandId: "b2", productId: "p2", priceCents: 30000, quantity: 1 })]);
    const byBrand = evaluateCoupon(coupon({ brandId: "b2" }), mixed, now, 0);
    expect(byBrand).toMatchObject({ ok: true, eligibleSubtotalCents: 30000, discountCents: 3000 }); // 10% só da marca b2
    expect(evaluateCoupon(coupon({ productId: "p9" }), mixed, now, 0)).toMatchObject({ ok: false, error: "NOT_ELIGIBLE" });
    expect(evaluateCoupon(coupon(), buildLines([item({ stockQty: 0 })]), now, 0)).toMatchObject({ ok: false, error: "NOT_ELIGIBLE" });
  });

  it("normaliza o código digitado", () => {
    expect(normalizeCouponCode("  bemvindo10 ")).toBe("BEMVINDO10");
    expect(normalizeCouponCode("a")).toBeNull();
    expect(normalizeCouponCode("x'; drop table")).toBeNull();
  });
});

describe("resumo do carrinho", () => {
  it("soma, aplica cupom e calcula o Pix sobre os produtos depois do cupom", () => {
    const s = computeCart([item({ quantity: 2 }), item({ id: "i2", variantId: "v2", productId: "p2", priceCents: 10000 })], coupon(), ctx({ pixDiscountPercent: 5 }));
    expect(s).toMatchObject({ itemCount: 3, subtotalCents: 50000, discountCents: 5000, totalCents: 45000, canCheckout: true, couponError: null });
    expect(s.coupon).toMatchObject({ code: "BEMVINDO10", discountCents: 5000 });
    expect(s.pix).toEqual({ discountPercent: 5, discountCents: 2250, totalCents: 42750 });
  });

  it("sem cupom e sem Pix, não inventa desconto", () => {
    const s = computeCart([item()], null, ctx());
    expect(s).toMatchObject({ discountCents: 0, totalCents: 20000, coupon: null, pix: null, freeShipping: null });
  });

  it("cupom que deixou de valer é sinalizado e não desconta", () => {
    const s = computeCart([item()], coupon({ endsAt: new Date("2026-09-01") }), ctx());
    expect(s.coupon).toBeNull();
    expect(s.couponError).toMatch(/expirou/);
    expect(s.totalCents).toBe(20000);
  });

  it("progresso do frete grátis e cupom de frete grátis", () => {
    const some = computeCart([item()], null, ctx({ freeShippingAboveCents: 30000 }));
    expect(some.freeShipping).toEqual({ thresholdCents: 30000, missingCents: 10000, reached: false, byCoupon: false });
    const reached = computeCart([item({ quantity: 2 })], null, ctx({ freeShippingAboveCents: 30000 }));
    expect(reached.freeShipping).toMatchObject({ reached: true, missingCents: 0 });
    const byCoupon = computeCart([item()], coupon({ type: "FREE_SHIPPING", value: 0 }), ctx());
    expect(byCoupon.freeShipping).toMatchObject({ reached: true, byCoupon: true });
    expect(computeCart([item()], null, ctx({ freeShippingAboveCents: 0 })).freeShipping).toBeNull();
  });

  it("indisponível bloqueia o checkout, quantidade reduzida não", () => {
    expect(computeCart([item(), item({ id: "i2", stockQty: 0 })], null, ctx())).toMatchObject({ canCheckout: false, hasBlockingIssues: true, subtotalCents: 20000 });
    expect(computeCart([item({ quantity: 9, stockQty: 4 })], null, ctx())).toMatchObject({ canCheckout: true, itemCount: 4 });
    expect(computeCart([], null, ctx()).canCheckout).toBe(false);
  });
});
