import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { computeFacets, parseCatalogParams, type CatalogItem } from "@/lib/catalog-filters";

// next/form precisa do roteador do Next; nos testes usamos um <form> simples
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
  });

  it("galeria e card funcionam sem imagem", () => {
    expect(renderToStaticMarkup(createElement(ProductGallery, { images: [], name: "Élan Noir", initial: "M" }))).toContain("M");
    const card = { id: "1", name: "Élan Noir", slug: "elan-noir", gender: "MASCULINO", concentration: "EDP", brand: { name: "Maison Élan" }, images: [], variants: [{ priceCents: 17990, compareAtCents: null, stockQty: 0, sizeMl: 50, label: "50 ml" }] } as never;
    const html = renderToStaticMarkup(createElement(ProductCard, { product: card, rules }));
    expect(html).toContain("Esgotado");
    expect(html).toContain("/produto/elan-noir");
  });
});
