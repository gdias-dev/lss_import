import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { computeFacets, parseCatalogParams, type CatalogItem } from "@/lib/catalog-filters";

// next/form precisa do roteador do Next; nos testes usamos um <form> simples
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => "/produto/elan-noir" }));
vi.mock("@/app/carrinho/actions", () => {
  const noop = async () => {};
  return { addToCartAction: async () => ({ ok: true, message: "ok" }), updateQuantityAction: noop, removeItemAction: noop, clearUnavailableAction: noop, applyCouponAction: async () => ({}), removeCouponAction: noop };
});
vi.mock("next/form", () => ({ default: (props: Record<string, unknown>) => createElement("form", { ...props, onChange: undefined }) }));

const { ActiveFilters } = await import("@/components/loja/ActiveFilters");
const { FilterPanel } = await import("@/components/loja/FilterPanel");
const { Pagination } = await import("@/components/loja/Pagination");
const { ProductPurchase } = await import("@/components/loja/ProductPurchase");
const { ProductGallery } = await import("@/components/loja/ProductGallery");
const { ProductCard } = await import("@/components/loja/ProductCard");

const items: CatalogItem[] = [
  { id: "1", name: "Élan Noir", brandSlug: "maison-elan", brandName: "Maison Élan", gender: "MASCULINO", concentration: "EDP", family: "Amadeirado", featured: true, createdAt: 1, score: 0, variants: [{ sizeMl: 50, priceCents: 17990, stockQty: 4 }, { sizeMl: 100, priceCents: 28990, stockQty: 0 }] },
  { id: "2", name: "Royal Rose", brandSlug: "oud-royal", brandName: "Oud Royal", gender: "FEMININO", concentration: "PARFUM", family: "Floral, frutal", featured: false, createdAt: 2, score: 0, variants: [{ sizeMl: 100, priceCents: 32990, stockQty: 9 }] },
];
const rules = { interestFreeMax: 3, minInstallmentCents: 3000, monthlyRate: 0.0299 };

describe("renderização com dados", () => {
  const filters = parseCatalogParams({ genero: "masculino", marca: "maison-elan", min: "100", estoque: "1", q: "élan" });
  const facets = computeFacets(items, filters);

  it("painel de filtros mostra grupos, contagens e seleção", () => {
    const html = renderToStaticMarkup(createElement(FilterPanel, { filters, facets }));
    expect(html).toContain("Maison Élan");
    expect(html).toContain('name="marca"');
    expect(html).toContain("Família olfativa");
    expect(html).toContain('name="q"');
    expect(html).toContain("Limpar filtros");
    expect(html).toContain('name="marca" checked="" value="maison-elan"');
  });

  it("etiquetas de filtros ativos têm link para remover", () => {
    const html = renderToStaticMarkup(createElement(ActiveFilters, { filters, facets }));
    expect(html).toContain("Remover filtro Masculinos");
    expect(html).toContain("Busca: élan");
    expect(html).toContain("Apenas disponíveis");
  });

  it("paginação marca a página atual", () => {
    const html = renderToStaticMarkup(createElement(Pagination, { page: 3, totalPages: 8, hrefFor: (p: number) => `/perfumes?pagina=${p}` }));
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Anterior");
    expect(html).toContain("Próxima");
    expect(renderToStaticMarkup(createElement(Pagination, { page: 1, totalPages: 1, hrefFor: () => "/" }))).toBe("");
  });

  it("compra: tamanho inicial é o primeiro com estoque, mostra Pix e parcelas", () => {
    const variants = [
      { id: "a", label: "50 ml", sizeMl: 50, priceCents: 17990, compareAtCents: 21990, stockQty: 2 },
      { id: "b", label: "100 ml", sizeMl: 100, priceCents: 28990, compareAtCents: null, stockQty: 0 },
    ];
    const html = renderToStaticMarkup(createElement(ProductPurchase, { productName: "Élan Noir", brandName: "Maison Élan", variants, rules, pixDiscountPercent: 5, whatsappNumber: "5521999990000" }));
    expect(html).toContain("179,90");
    expect(html).toContain("-18%");
    expect(html).toContain("no Pix");
    expect(html).toContain("Poucas unidades");
    expect(html).toContain("(esgotado)");
    expect(html).toContain("wa.me/5521999990000");
    expect(html).toContain("parcelamento");
    expect(html).toContain("Adicionar ao carrinho");
    expect(html).toContain("Quantidade");
  });

  it("compra: tamanho esgotado não deixa adicionar", () => {
    const variants = [{ id: "b", label: "100 ml", sizeMl: 100, priceCents: 28990, compareAtCents: null, stockQty: 0 }];
    const html = renderToStaticMarkup(createElement(ProductPurchase, { productName: "Élan Noir", brandName: "Maison Élan", variants, rules, pixDiscountPercent: 0, whatsappNumber: null }));
    expect(html).toContain("Indisponível");
    expect(html).toContain("disabled");
    expect(html).not.toContain("Quantidade");
  });

  it("galeria e card funcionam sem imagem", () => {
    expect(renderToStaticMarkup(createElement(ProductGallery, { images: [], name: "Élan Noir", initial: "M" }))).toContain("M");
    const card = { id: "1", name: "Élan Noir", slug: "elan-noir", gender: "MASCULINO", concentration: "EDP", brand: { name: "Maison Élan" }, images: [], variants: [{ priceCents: 17990, compareAtCents: null, stockQty: 0, sizeMl: 50, label: "50 ml" }] } as never;
    const html = renderToStaticMarkup(createElement(ProductCard, { product: card, rules }));
    expect(html).toContain("Esgotado");
    expect(html).toContain("/produto/elan-noir");
  });
});

describe("carrinho", () => {
  vi.mock("@/components/carrinho/CouponForm", () => ({ CouponForm: (p: { appliedCode: string | null }) => createElement("div", null, p.appliedCode ? `cupom ${p.appliedCode}` : "sem cupom") }));

  it("linha do carrinho mostra quantidade, aviso de estoque e bloqueio de indisponível", async () => {
    const { CartLineItem } = await import("@/components/carrinho/CartLineItem");
    const { buildLines } = await import("@/lib/cart");
    const base = { id: "i1", variantId: "v1", productId: "p1", brandId: "b1", slug: "elan-noir", productName: "Élan Noir", brandName: "Maison Élan", variantLabel: "100 ml", quantity: 9, priceCents: 20000, compareAtCents: null, imageUrl: null, imageAlt: null };
    const [reduced, gone] = buildLines([{ ...base, stockQty: 4, active: true }, { ...base, id: "i2", stockQty: 0, active: true }]);
    const a = renderToStaticMarkup(createElement(CartLineItem, { line: reduced! }));
    expect(a).toContain("quantidade foi ajustada");
    expect(a).toContain("Aumentar quantidade");
    expect(a).toContain("800,00"); // 4 x R$ 200
    const b = renderToStaticMarkup(createElement(CartLineItem, { line: gone! }));
    expect(b).toContain("esgotou");
    expect(b).not.toContain("Aumentar quantidade");
  });

  it("resumo mostra desconto, Pix, frete grátis e o botão de finalizar desligado", async () => {
    const { CartSummaryPanel } = await import("@/components/carrinho/CartSummaryPanel");
    const { computeCart } = await import("@/lib/cart");
    const item = { id: "i1", variantId: "v1", productId: "p1", brandId: "b1", slug: "x", productName: "X", brandName: "M", variantLabel: "100 ml", quantity: 2, priceCents: 20000, compareAtCents: null, stockQty: 5, active: true, imageUrl: null, imageAlt: null };
    const coupon = { id: "c", code: "BEMVINDO10", type: "PERCENT" as const, value: 10, minSubtotalCents: 0, maxUses: null, usedCount: 0, perUserLimit: null, startsAt: null, endsAt: null, active: true, brandId: null, productId: null };
    const cart = computeCart([item], coupon, { now: new Date(), userUses: 0, pixDiscountPercent: 5, freeShippingAboveCents: 50000 });
    const html = renderToStaticMarkup(createElement(CartSummaryPanel, { cart }));
    expect(html).toContain("cupom BEMVINDO10");
    expect(html).toContain("-");
    expect(html).toContain("no Pix");
    expect(html).toContain("Faltam");
    expect(html).toContain("frete grátis");
    expect(html).toContain('href="/checkout"');
  });
});

describe("SearchBox", () => {
  it("renderiza o campo de busca sem sugestões abertas por padrão", async () => {
    const { SearchBox } = await import("@/components/loja/SearchBox");
    const html = renderToStaticMarkup(createElement(SearchBox));
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('role="listbox"');
  });
});
