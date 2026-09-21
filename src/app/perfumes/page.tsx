import type { Metadata } from "next";
import Link from "next/link";
import { ActiveFilters } from "@/components/loja/ActiveFilters";
import { FilterDrawer } from "@/components/loja/FilterDrawer";
import { FilterPanel } from "@/components/loja/FilterPanel";
import { Pagination } from "@/components/loja/Pagination";
import { ProductCard } from "@/components/loja/ProductCard";
import { searchCatalog } from "@/lib/catalog";
import { activeFilterCount, buildCatalogHref, GENDER_PLURAL, parseCatalogParams, SORT_LABEL, type SortKey } from "@/lib/catalog-filters";
import { installmentRules, getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = parseCatalogParams(await searchParams);
  const onlyGender = f.genders.length === 1 && activeFilterCount(f) === 1 && !f.q && f.page === 1;
  const title = onlyGender && f.genders[0] ? `Perfumes ${GENDER_PLURAL[f.genders[0]]}` : "Perfumes";
  // páginas filtradas, buscas e páginas 2+ não entram no Google (evita conteúdo duplicado)
  const indexable = onlyGender || (activeFilterCount(f) === 0 && !f.q && f.page === 1 && f.sort === "relevancia");
  return { title, alternates: { canonical: onlyGender && f.genders[0] ? `/perfumes?genero=${f.genders[0].toLowerCase()}` : "/perfumes" }, robots: indexable ? undefined : { index: false, follow: true } };
}

export default async function PerfumesPage({ searchParams }: Props) {
  const filters = parseCatalogParams(await searchParams);
  const [result, settings] = await Promise.all([searchCatalog(filters), getSettings()]);
  const rules = installmentRules(settings);
  const onlyGender = filters.genders.length === 1 && activeFilterCount(filters) === 1 && !filters.q;

  const heading = filters.q ? `Resultados para “${filters.q}”` : onlyGender && filters.genders[0] ? `Perfumes ${GENDER_PLURAL[filters.genders[0]]}` : "Perfumes";

  return (
    <div className="container-page py-14">
      <p className="eyebrow mb-3">Catálogo</p>
      <h1 className="section-title mb-10">{heading}</h1>

      <div className="grid gap-10 lg:grid-cols-[16rem_1fr]">
        <aside aria-label="Filtros">
          <FilterDrawer activeCount={activeFilterCount(filters)}>
            <FilterPanel filters={filters} facets={result.facets} />
          </FilterDrawer>
        </aside>

        <section aria-label="Resultados">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted" aria-live="polite">
              {result.total === 1 ? "1 perfume" : `${result.total} perfumes`}
            </p>
            <nav aria-label="Ordenar por" className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Ordenar:</span>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                <Link
                  key={key}
                  href={buildCatalogHref(filters, { sort: key, page: 1 })}
                  aria-current={filters.sort === key ? "true" : undefined}
                  className={cn("rounded-full px-3 py-1 transition", filters.sort === key ? "bg-gold/15 text-gold" : "text-ivory/80 hover:text-gold")}
                >
                  {SORT_LABEL[key]}
                </Link>
              ))}
            </nav>
          </div>

          <ActiveFilters filters={filters} facets={result.facets} />

          {result.products.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 xl:grid-cols-3">
              {result.products.map((p) => (
                <ProductCard key={p.id} product={p} rules={rules} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-surface p-10 text-center">
              <p className="mb-4 text-muted">Nenhum perfume encontrado com esses filtros.</p>
              <Link href="/perfumes" className="btn-outline">Limpar filtros e busca</Link>
            </div>
          )}

          <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => buildCatalogHref(filters, { page: p })} />
        </section>
      </div>
    </div>
  );
}
