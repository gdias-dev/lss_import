/**
 * Lógica pura do catálogo (sem banco): interpreta a URL, filtra, calcula facetas, ordena e pagina.
 * Fica separada do Prisma para ser testada e para o servidor fazer só UMA consulta leve.
 */
import { toCents } from "./money";

export type GenderValue = "FEMININO" | "MASCULINO" | "UNISSEX";
export type ConcentrationValue = "EXTRAIT" | "PARFUM" | "EDP" | "EDT" | "COLOGNE" | "OUTRO";
export type SortKey = "relevancia" | "menor-preco" | "maior-preco" | "novidades";

export const PAGE_SIZE = 12;

export const GENDER_ORDER: GenderValue[] = ["FEMININO", "MASCULINO", "UNISSEX"];
export const GENDER_LABEL: Record<GenderValue, string> = { FEMININO: "Feminino", MASCULINO: "Masculino", UNISSEX: "Unissex" };
export const GENDER_PLURAL: Record<GenderValue, string> = { FEMININO: "Femininos", MASCULINO: "Masculinos", UNISSEX: "Unissex" };

export const CONCENTRATION_ORDER: ConcentrationValue[] = ["EXTRAIT", "PARFUM", "EDP", "EDT", "COLOGNE", "OUTRO"];
export const CONCENTRATION_LABEL: Record<ConcentrationValue, string> = {
  EXTRAIT: "Extrait",
  PARFUM: "Parfum",
  EDP: "Eau de Parfum",
  EDT: "Eau de Toilette",
  COLOGNE: "Colônia",
  OUTRO: "Outro",
};

export const SORT_LABEL: Record<SortKey, string> = {
  relevancia: "Relevância",
  "menor-preco": "Menor preço",
  "maior-preco": "Maior preço",
  novidades: "Novidades",
};

const GENDER_PARAM = Object.fromEntries(GENDER_ORDER.map((g) => [g.toLowerCase(), g])) as Record<string, GenderValue>;
const CONCENTRATION_PARAM = Object.fromEntries(CONCENTRATION_ORDER.map((c) => [c.toLowerCase(), c])) as Record<string, ConcentrationValue>;

export interface CatalogFilters {
  q?: string;
  genders: GenderValue[];
  brands: string[]; // slugs
  concentrations: ConcentrationValue[];
  families: string[];
  sizes: number[]; // ml
  minCents?: number;
  maxCents?: number;
  inStock: boolean;
  sort: SortKey;
  page: number;
}

export interface CatalogVariant {
  sizeMl: number;
  priceCents: number;
  stockQty: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  brandSlug: string;
  brandName: string;
  gender: GenderValue;
  concentration: ConcentrationValue;
  family: string | null;
  featured: boolean;
  createdAt: number; // timestamp
  score: number; // relevância da busca por texto (0 sem busca)
  variants: CatalogVariant[];
}

// ------------------------------------------------------------ URL <-> filtros

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const toList = (v: string | string[] | undefined, split = true): string[] =>
  (Array.isArray(v) ? v : v ? [v] : [])
    .flatMap((s) => (split ? s.split(",") : [s]))
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
const unique = <T>(xs: T[]) => [...new Set(xs)];
const isDefined = <T>(x: T | undefined): x is T => x !== undefined;
const pick = <T>(map: Record<string, T>, key: string): T | undefined => (Object.hasOwn(map, key) ? map[key] : undefined);

function parseMoney(v?: string): number | undefined {
  if (!v?.trim()) return undefined;
  try {
    const cents = toCents(v);
    return cents <= 10_000_000 ? cents : undefined;
  } catch {
    return undefined;
  }
}

export function parseCatalogParams(sp: RawParams): CatalogFilters {
  let minCents = parseMoney(first(sp.min));
  let maxCents = parseMoney(first(sp.max));
  if (minCents !== undefined && maxCents !== undefined && minCents > maxCents) [minCents, maxCents] = [maxCents, minCents];

  const sortRaw = first(sp.ordem) ?? "";
  const pageRaw = Number.parseInt(first(sp.pagina) ?? "1", 10);

  return {
    q: first(sp.q)?.trim().slice(0, 80) || undefined,
    genders: unique(toList(sp.genero).map((g) => pick(GENDER_PARAM, g.toLowerCase())).filter(isDefined)),
    brands: unique(toList(sp.marca).map((s) => s.toLowerCase()).filter((s) => /^[a-z0-9-]{1,60}$/.test(s))),
    concentrations: unique(toList(sp.conc).map((c) => pick(CONCENTRATION_PARAM, c.toLowerCase())).filter(isDefined)),
    families: unique(toList(sp.familia, false).map((s) => s.slice(0, 60))),
    sizes: unique(toList(sp.tam).map(Number).filter((n) => Number.isInteger(n) && n > 0 && n <= 1000)),
    minCents,
    maxCents,
    inStock: first(sp.estoque) === "1",
    sort: Object.hasOwn(SORT_LABEL, sortRaw) ? (sortRaw as SortKey) : "relevancia",
    page: Number.isFinite(pageRaw) ? Math.min(Math.max(pageRaw, 1), 500) : 1,
  };
}

export function buildCatalogHref(f: CatalogFilters, patch: Partial<CatalogFilters> = {}, base = "/perfumes"): string {
  const m = { ...f, ...patch };
  const p = new URLSearchParams();
  if (m.q) p.set("q", m.q);
  m.genders.forEach((g) => p.append("genero", g.toLowerCase()));
  m.brands.forEach((b) => p.append("marca", b));
  m.concentrations.forEach((c) => p.append("conc", c.toLowerCase()));
  m.families.forEach((x) => p.append("familia", x));
  m.sizes.forEach((s) => p.append("tam", String(s)));
  if (m.minCents !== undefined) p.set("min", String(m.minCents / 100));
  if (m.maxCents !== undefined) p.set("max", String(m.maxCents / 100));
  if (m.inStock) p.set("estoque", "1");
  if (m.sort !== "relevancia") p.set("ordem", m.sort);
  if (m.page > 1) p.set("pagina", String(m.page));
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Quantos filtros (fora busca, ordem e página) estão ligados. */
export function activeFilterCount(f: CatalogFilters): number {
  return f.genders.length + f.brands.length + f.concentrations.length + f.families.length + f.sizes.length + (f.minCents !== undefined || f.maxCents !== undefined ? 1 : 0) + (f.inStock ? 1 : 0);
}

// ------------------------------------------------------------ filtragem

type Dimension = "genders" | "brands" | "concentrations" | "families" | "sizes" | "price";

function variantOk(v: CatalogVariant, f: CatalogFilters, skip: Dimension | null): boolean {
  if (f.inStock && v.stockQty <= 0) return false;
  if (skip !== "sizes" && f.sizes.length > 0 && !f.sizes.includes(v.sizeMl)) return false;
  if (skip !== "price") {
    if (f.minCents !== undefined && v.priceCents < f.minCents) return false;
    if (f.maxCents !== undefined && v.priceCents > f.maxCents) return false;
  }
  return true;
}

/** `skip` ignora uma dimensão, usado para contar as facetas (cada grupo conta com os OUTROS filtros aplicados). */
export function itemMatches(item: CatalogItem, f: CatalogFilters, skip: Dimension | null = null): boolean {
  if (skip !== "genders" && f.genders.length > 0 && !f.genders.includes(item.gender)) return false;
  if (skip !== "brands" && f.brands.length > 0 && !f.brands.includes(item.brandSlug)) return false;
  if (skip !== "concentrations" && f.concentrations.length > 0 && !f.concentrations.includes(item.concentration)) return false;
  if (skip !== "families" && f.families.length > 0 && !(item.family && f.families.includes(item.family))) return false;
  return item.variants.some((v) => variantOk(v, f, skip));
}

// ------------------------------------------------------------ facetas

export interface FacetOption<T> {
  value: T;
  label: string;
  count: number;
}

export interface CatalogFacets {
  genders: FacetOption<GenderValue>[];
  brands: FacetOption<string>[];
  concentrations: FacetOption<ConcentrationValue>[];
  families: FacetOption<string>[];
  sizes: FacetOption<number>[];
  price: { minCents: number; maxCents: number } | null;
}

export const emptyFacets = (): CatalogFacets => ({ genders: [], brands: [], concentrations: [], families: [], sizes: [], price: null });

export function computeFacets(items: CatalogItem[], f: CatalogFilters): CatalogFacets {
  const forDim = (d: Dimension) => items.filter((i) => itemMatches(i, f, d));

  const count = <T>(list: CatalogItem[], keyOf: (i: CatalogItem) => T[]) => {
    const m = new Map<T, number>();
    for (const i of list) for (const k of new Set(keyOf(i))) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  };

  const genderCounts = count(forDim("genders"), (i) => [i.gender]);
  const concCounts = count(forDim("concentrations"), (i) => [i.concentration]);
  const familyCounts = count(forDim("families"), (i) => (i.family ? [i.family] : []));
  const sizeCounts = count(forDim("sizes"), (i) => i.variants.filter((v) => variantOk(v, f, "sizes")).map((v) => v.sizeMl));

  const brandList = forDim("brands");
  const brandCounts = count(brandList, (i) => [i.brandSlug]);
  const brandNames = new Map(items.map((i) => [i.brandSlug, i.brandName]));

  // valores já selecionados sempre aparecem (mesmo com 0), para o cliente poder desmarcar
  const withSelected = <T>(counts: Map<T, number>, selected: T[]) => {
    const m = new Map(counts);
    for (const s of selected) if (!m.has(s)) m.set(s, 0);
    return m;
  };

  const priceVariants = forDim("price").flatMap((i) => i.variants.filter((v) => variantOk(v, f, "price")));
  const prices = priceVariants.map((v) => v.priceCents);

  return {
    genders: GENDER_ORDER.filter((g) => (genderCounts.get(g) ?? 0) > 0 || f.genders.includes(g)).map((g) => ({ value: g, label: GENDER_PLURAL[g], count: genderCounts.get(g) ?? 0 })),
    brands: [...withSelected(brandCounts, f.brands)]
      .map(([slug, n]) => ({ value: slug, label: brandNames.get(slug) ?? slug, count: n }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR")),
    concentrations: CONCENTRATION_ORDER.filter((c) => (concCounts.get(c) ?? 0) > 0 || f.concentrations.includes(c)).map((c) => ({ value: c, label: CONCENTRATION_LABEL[c], count: concCounts.get(c) ?? 0 })),
    families: [...withSelected(familyCounts, f.families)]
      .map(([fam, n]) => ({ value: fam, label: fam, count: n }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR")),
    sizes: [...withSelected(sizeCounts, f.sizes)].map(([ml, n]) => ({ value: ml, label: `${ml} ml`, count: n })).sort((a, b) => a.value - b.value),
    price: prices.length > 0 ? { minCents: Math.min(...prices), maxCents: Math.max(...prices) } : null,
  };
}

// ------------------------------------------------------------ ordenação e paginação

/** Menor preço entre as variações que passam nos filtros (é o "a partir de" mostrado no card). */
export function displayPrice(item: CatalogItem, f: CatalogFilters): number {
  const matching = item.variants.filter((v) => variantOk(v, f, null));
  const pool = matching.length > 0 ? matching : item.variants;
  return Math.min(...pool.map((v) => v.priceCents));
}

export function sortItems(items: CatalogItem[], f: CatalogFilters): CatalogItem[] {
  const available = (i: CatalogItem) => (i.variants.some((v) => v.stockQty > 0) ? 1 : 0);
  const byName = (a: CatalogItem, b: CatalogItem) => a.name.localeCompare(b.name, "pt-BR");
  const bySort = (a: CatalogItem, b: CatalogItem): number => {
    switch (f.sort) {
      case "menor-preco":
        return displayPrice(a, f) - displayPrice(b, f);
      case "maior-preco":
        return displayPrice(b, f) - displayPrice(a, f);
      case "novidades":
        return b.createdAt - a.createdAt;
      default:
        return b.score - a.score || Number(b.featured) - Number(a.featured) || b.createdAt - a.createdAt;
    }
  };
  // esgotados sempre no fim
  return [...items].sort((a, b) => available(b) - available(a) || bySort(a, b) || byName(a, b));
}

export function paginate(total: number, page: number, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { page: Math.min(Math.max(1, page), totalPages), totalPages };
}

export interface CatalogRun {
  ids: string[];
  total: number;
  page: number;
  totalPages: number;
  facets: CatalogFacets;
}

export function runCatalog(items: CatalogItem[], f: CatalogFilters, pageSize = PAGE_SIZE): CatalogRun {
  const sorted = sortItems(items.filter((i) => itemMatches(i, f)), f);
  const { page, totalPages } = paginate(sorted.length, f.page, pageSize);
  return {
    ids: sorted.slice((page - 1) * pageSize, page * pageSize).map((i) => i.id),
    total: sorted.length,
    page,
    totalPages,
    facets: computeFacets(items, f),
  };
}
