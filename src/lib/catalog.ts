import { Prisma, type Gender } from "@prisma/client";
import { emptyFacets, PAGE_SIZE, runCatalog, type CatalogFacets, type CatalogFilters, type CatalogItem } from "./catalog-filters";
import { hasDatabase } from "./env";
import { prisma } from "./prisma";

const cardSelect = {
  id: true,
  name: true,
  slug: true,
  gender: true,
  concentration: true,
  brand: { select: { name: true } },
  images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } },
  variants: {
    where: { active: true },
    select: { priceCents: true, compareAtCents: true, stockQty: true, sizeMl: true, label: true },
  },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

/** Vitrine simples (home): destaques ou últimos cadastrados. */
export async function listProducts(opts: { gender?: Gender; featured?: boolean; take?: number } = {}): Promise<ProductCardData[]> {
  if (!hasDatabase) return [];
  try {
    return await prisma.product.findMany({
      where: { active: true, ...(opts.gender ? { gender: opts.gender } : {}), ...(opts.featured ? { featured: true } : {}) },
      select: cardSelect,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: opts.take ?? 48,
    });
  } catch (error) {
    console.error("[catalog] listProducts", error);
    return [];
  }
}

// ------------------------------------------------------------ busca por texto

let warnedSearchExtensions = false;

/** Monta a consulta de busca. Exportada para poder ser testada contra um PostgreSQL de verdade. */
export function buildTextSearchSql(q: string): Prisma.Sql {
  const tokens = q.split(/\s+/).filter(Boolean).slice(0, 6);
  const esc = (s: string) => s.replace(/[\\%_]/g, "\\$&");
  const hay = Prisma.sql`unaccent(p."name" || ' ' || b."name")`;
  const tokenConds = Prisma.join(
    tokens.map((t) => Prisma.sql`${hay} ILIKE ${"%" + esc(t) + "%"}`),
    " AND ",
  );
  return Prisma.sql`
    SELECT p.id,
           (word_similarity(unaccent(${q}), ${hay}) * 0.7 + similarity(unaccent(${q}), ${hay}) * 0.3)::float8 AS score
    FROM "Product" p
    JOIN "Brand" b ON b.id = p."brandId"
    WHERE p.active = true
      AND ((${tokenConds}) OR word_similarity(unaccent(${q}), ${hay}) > 0.5)
    ORDER BY score DESC
    LIMIT 500`;
}

/**
 * Busca sem acento e tolerante a erro de digitação (pg_trgm + unaccent).
 * Se as extensões não existirem no banco, cai para uma busca simples por "contém".
 * Ative com: npm run db:constraints e npm run db:search
 */
async function searchIdsByText(q: string): Promise<Map<string, number>> {
  try {
    const rows = await prisma.$queryRaw<{ id: string; score: number }[]>(buildTextSearchSql(q));
    return new Map(rows.map((r) => [r.id, Number(r.score)]));
  } catch (error) {
    if (!warnedSearchExtensions) {
      warnedSearchExtensions = true;
      console.warn("[catalog] busca avançada indisponível (rode npm run db:constraints e npm run db:search). Usando busca simples.", error);
    }
    const rows = await prisma.product.findMany({
      where: { active: true, OR: [{ name: { contains: q, mode: "insensitive" } }, { brand: { name: { contains: q, mode: "insensitive" } } }] },
      select: { id: true },
    });
    return new Map(rows.map((r) => [r.id, 1]));
  }
}

// ------------------------------------------------------------ listagem com filtros

export interface CatalogPage {
  products: ProductCardData[];
  total: number;
  page: number;
  totalPages: number;
  facets: CatalogFacets;
}

const emptyPage = (): CatalogPage => ({ products: [], total: 0, page: 1, totalPages: 1, facets: emptyFacets() });

/**
 * Uma consulta leve traz todos os produtos ativos (ou os achados pela busca); filtros, facetas, ordem e página
 * são calculados em memória por funções puras e testadas. Adequado para catálogos de até alguns milhares de produtos.
 * Se o catálogo crescer muito, mover os filtros para SQL.
 */
export async function searchCatalog(filters: CatalogFilters, pageSize = PAGE_SIZE): Promise<CatalogPage> {
  if (!hasDatabase) return emptyPage();
  try {
    const scores = filters.q ? await searchIdsByText(filters.q) : null;
    if (scores && scores.size === 0) return emptyPage();

    const rows = await prisma.product.findMany({
      where: { active: true, ...(scores ? { id: { in: [...scores.keys()] } } : {}) },
      select: {
        id: true,
        name: true,
        gender: true,
        concentration: true,
        olfactoryFamily: true,
        featured: true,
        createdAt: true,
        brand: { select: { slug: true, name: true } },
        variants: { where: { active: true }, select: { sizeMl: true, priceCents: true, stockQty: true } },
      },
    });

    const items: CatalogItem[] = rows
      .filter((r) => r.variants.length > 0)
      .map((r) => ({
        id: r.id,
        name: r.name,
        brandSlug: r.brand.slug,
        brandName: r.brand.name,
        gender: r.gender,
        concentration: r.concentration,
        family: r.olfactoryFamily,
        featured: r.featured,
        createdAt: r.createdAt.getTime(),
        score: scores?.get(r.id) ?? 0,
        variants: r.variants,
      }));

    const run = runCatalog(items, filters, pageSize);
    const cards = run.ids.length > 0 ? await prisma.product.findMany({ where: { id: { in: run.ids } }, select: cardSelect }) : [];
    const byId = new Map(cards.map((c) => [c.id, c]));
    const products = run.ids.map((id) => byId.get(id)).filter((p): p is ProductCardData => Boolean(p));

    return { products, total: run.total, page: run.page, totalPages: run.totalPages, facets: run.facets };
  } catch (error) {
    console.error("[catalog] searchCatalog", error);
    return emptyPage();
  }
}

// ------------------------------------------------------------ produto

export async function getProductBySlug(slug: string) {
  if (!hasDatabase) return null;
  try {
    return await prisma.product.findFirst({
      where: { slug, active: true },
      include: {
        brand: true,
        images: { orderBy: { position: "asc" } },
        variants: { where: { active: true }, orderBy: { sizeMl: "asc" } },
      },
    });
  } catch (error) {
    console.error("[catalog] getProductBySlug", error);
    return null;
  }
}

/** Mesma marca primeiro, depois mesmo gênero. */
export async function getRelatedProducts(product: { id: string; brandId: string; gender: Gender }, take = 4): Promise<ProductCardData[]> {
  if (!hasDatabase) return [];
  try {
    const rows = await prisma.product.findMany({
      where: { active: true, id: { not: product.id }, OR: [{ brandId: product.brandId }, { gender: product.gender }] },
      select: { ...cardSelect, brandId: true },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 24,
    });
    const rank = (r: { brandId: string }) => (r.brandId === product.brandId ? 0 : 1);
    return rows
      .filter((r) => r.variants.length > 0)
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, take);
  } catch (error) {
    console.error("[catalog] getRelatedProducts", error);
    return [];
  }
}

export async function getAllProductSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  if (!hasDatabase) return [];
  try {
    return await prisma.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } });
  } catch {
    return [];
  }
}

/** Menor preço entre as variações com estoque (ou entre todas se estiver esgotado). */
export function cardPrice(variants: ProductCardData["variants"]) {
  const inStockVariants = variants.filter((v) => v.stockQty > 0);
  const pool = inStockVariants.length > 0 ? inStockVariants : variants;
  const cheapest = [...pool].sort((a, b) => a.priceCents - b.priceCents)[0];
  return {
    fromCents: cheapest?.priceCents ?? null,
    compareAtCents: cheapest?.compareAtCents ?? null,
    inStock: inStockVariants.length > 0,
    hasManyPrices: new Set(pool.map((v) => v.priceCents)).size > 1,
  };
}
