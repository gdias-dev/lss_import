import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  buildCatalogHref,
  computeFacets,
  itemMatches,
  paginate,
  parseCatalogParams,
  runCatalog,
  sortItems,
  type CatalogFilters,
  type CatalogItem,
} from "@/lib/catalog-filters";

const F = (over: Partial<CatalogFilters> = {}): CatalogFilters => ({ ...parseCatalogParams({}), ...over });

const item = (over: Partial<CatalogItem> & Pick<CatalogItem, "id" | "name">): CatalogItem => ({
  brandSlug: "maison-elan",
  brandName: "Maison Élan",
  gender: "FEMININO",
  concentration: "EDP",
  family: "Floral",
  featured: false,
  createdAt: 1_000,
  score: 0,
  variants: [
    { sizeMl: 50, priceCents: 15000, stockQty: 5 },
    { sizeMl: 100, priceCents: 25000, stockQty: 5 },
  ],
  ...over,
});

const items: CatalogItem[] = [
  item({ id: "1", name: "Alfa", featured: true, createdAt: 3_000 }),
  item({ id: "2", name: "Beta", gender: "MASCULINO", brandSlug: "oud-royal", brandName: "Oud Royal", family: "Amadeirado", concentration: "PARFUM", createdAt: 2_000, variants: [{ sizeMl: 100, priceCents: 40000, stockQty: 2 }] }),
  item({ id: "3", name: "Gama", gender: "UNISSEX", family: "Cítrico", concentration: "EDT", createdAt: 1_000, variants: [{ sizeMl: 50, priceCents: 9000, stockQty: 0 }] }),
  item({ id: "4", name: "Delta", gender: "MASCULINO", family: "Amadeirado", createdAt: 4_000, variants: [{ sizeMl: 50, priceCents: 12000, stockQty: 3 }, { sizeMl: 100, priceCents: 20000, stockQty: 0 }] }),
];

describe("parseCatalogParams", () => {
  it("usa padrões seguros", () => {
    expect(parseCatalogParams({})).toMatchObject({ genders: [], brands: [], sort: "relevancia", page: 1, inStock: false });
  });

  it("interpreta e sanitiza a URL", () => {
    const f = parseCatalogParams({
      genero: ["feminino", "invalido", "constructor"],
      marca: "maison-elan,OUD-ROYAL,../etc",
      conc: "edp",
      tam: "50,abc,100,-5",
      min: "300",
      max: "100",
      estoque: "1",
      ordem: "menor-preco",
      pagina: "3",
      q: "  élan  ",
      familia: "Floral, frutal",
    });
    expect(f.genders).toEqual(["FEMININO"]);
    expect(f.brands).toEqual(["maison-elan", "oud-royal"]);
    expect(f.concentrations).toEqual(["EDP"]);
    expect(f.sizes).toEqual([50, 100]);
    expect([f.minCents, f.maxCents]).toEqual([10000, 30000]); // min e max trocados
    expect(f).toMatchObject({ inStock: true, sort: "menor-preco", page: 3, q: "élan" });
    expect(f.families).toEqual(["Floral, frutal"]); // vírgula faz parte do nome
  });

  it("limita página e ordem inválidas", () => {
    expect(parseCatalogParams({ pagina: "-4", ordem: "xyz" })).toMatchObject({ page: 1, sort: "relevancia" });
    expect(parseCatalogParams({ pagina: "99999" }).page).toBe(500);
  });
});

describe("buildCatalogHref", () => {
  it("volta ao mesmo estado ao ser lida de novo", () => {
    const f = F({ genders: ["FEMININO"], brands: ["oud-royal"], sizes: [100], minCents: 5000, inStock: true, sort: "maior-preco", families: ["Floral, frutal"], q: "oud", page: 2 });
    const url = new URL(buildCatalogHref(f), "http://x");
    const back = parseCatalogParams(Object.fromEntries([...new Set(url.searchParams.keys())].map((k) => [k, url.searchParams.getAll(k)])));
    expect(back).toEqual(f);
  });

  it("omite padrões e aceita alterações", () => {
    expect(buildCatalogHref(F())).toBe("/perfumes");
    expect(buildCatalogHref(F({ page: 3 }), { page: 1, brands: ["a"] })).toBe("/perfumes?marca=a");
  });

  it("conta filtros ativos", () => {
    expect(activeFilterCount(F({ genders: ["FEMININO"], minCents: 1, inStock: true }))).toBe(3);
  });
});

describe("filtragem", () => {
  it("filtra por variação (tamanho e preço na mesma variação)", () => {
    // 50 ml até R$ 100: só a Gama (R$ 90). A Alfa tem 50 ml por R$ 150, a Delta por R$ 120.
    const f = F({ sizes: [50], maxCents: 10000 });
    expect(items.filter((i) => itemMatches(i, f)).map((i) => i.id)).toEqual(["3"]);
  });

  it("apenas disponíveis considera o estoque da variação", () => {
    const f = F({ sizes: [100], inStock: true });
    expect(items.filter((i) => itemMatches(i, f)).map((i) => i.id)).toEqual(["1", "2"]); // Delta 100 ml está esgotado
  });

  it("combina gênero e marca", () => {
    expect(items.filter((i) => itemMatches(i, F({ genders: ["MASCULINO"], brands: ["oud-royal"] }))).map((i) => i.id)).toEqual(["2"]);
  });
});

describe("facetas", () => {
  it("cada grupo conta com os OUTROS filtros aplicados", () => {
    const f = F({ genders: ["MASCULINO"] });
    const facets = computeFacets(items, f);
    // gênero ignora o próprio filtro: mostra os 3 gêneros
    expect(facets.genders.map((g) => [g.value, g.count])).toEqual([["FEMININO", 1], ["MASCULINO", 2], ["UNISSEX", 1]]);
    // marca respeita o gênero: só 2 masculinos (Beta na Oud Royal, Delta na Maison Élan)
    expect(facets.brands.map((b) => [b.value, b.count]).sort()).toEqual([["maison-elan", 1], ["oud-royal", 1]]);
  });

  it("mantém selecionados com contagem zero e informa faixa de preço", () => {
    const facets = computeFacets(items, F({ brands: ["marca-inexistente"] }));
    expect(facets.brands.find((b) => b.value === "marca-inexistente")).toMatchObject({ count: 0 });
    const all = computeFacets(items, F());
    expect(all.price).toEqual({ minCents: 9000, maxCents: 40000 });
    expect(all.sizes.map((s) => s.value)).toEqual([50, 100]);
  });
});

describe("ordenação e paginação", () => {
  it("esgotados vão para o fim", () => {
    const sorted = sortItems(items, F({ sort: "novidades" })).map((i) => i.id);
    expect(sorted).toEqual(["4", "1", "2", "3"]); // Gama (esgotada) por último mesmo sendo a mais antiga... e mais barata
  });

  it("ordena por preço 'a partir de'", () => {
    expect(sortItems(items, F({ sort: "menor-preco" })).map((i) => i.id)).toEqual(["4", "1", "2", "3"]);
    expect(sortItems(items, F({ sort: "maior-preco" })).map((i) => i.id)).toEqual(["2", "1", "4", "3"]);
  });

  it("relevância: busca, depois destaque", () => {
    const scored = items.map((i) => (i.id === "2" ? { ...i, score: 0.9 } : i));
    expect(sortItems(scored, F({ q: "beta" }))[0]?.id).toBe("2");
    expect(sortItems(items, F())[0]?.id).toBe("1"); // destaque
  });

  it("pagina e ajusta página fora do intervalo", () => {
    expect(paginate(25, 2, 12)).toEqual({ page: 2, totalPages: 3 });
    expect(paginate(25, 99, 12)).toEqual({ page: 3, totalPages: 3 });
    expect(paginate(0, 1, 12)).toEqual({ page: 1, totalPages: 1 });
    const many = Array.from({ length: 30 }, (_, i) => item({ id: String(i), name: `P${String(i).padStart(2, "0")}` }));
    const run = runCatalog(many, F({ page: 3 }), 12);
    expect(run.ids).toHaveLength(6);
    expect(run.total).toBe(30);
  });
});
