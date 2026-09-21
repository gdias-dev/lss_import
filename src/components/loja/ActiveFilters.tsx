import Link from "next/link";
import { buildCatalogHref, CONCENTRATION_LABEL, GENDER_PLURAL, type CatalogFacets, type CatalogFilters } from "@/lib/catalog-filters";
import { formatBRL } from "@/lib/money";

export function ActiveFilters({ filters, facets }: { filters: CatalogFilters; facets: CatalogFacets }) {
  const brandName = (slug: string) => facets.brands.find((b) => b.value === slug)?.label ?? slug;
  const chips: { label: string; href: string }[] = [
    ...(filters.q ? [{ label: `Busca: ${filters.q}`, href: buildCatalogHref(filters, { q: undefined, page: 1 }) }] : []),
    ...filters.genders.map((g) => ({ label: GENDER_PLURAL[g], href: buildCatalogHref(filters, { genders: filters.genders.filter((x) => x !== g), page: 1 }) })),
    ...filters.brands.map((b) => ({ label: brandName(b), href: buildCatalogHref(filters, { brands: filters.brands.filter((x) => x !== b), page: 1 }) })),
    ...filters.concentrations.map((c) => ({ label: CONCENTRATION_LABEL[c], href: buildCatalogHref(filters, { concentrations: filters.concentrations.filter((x) => x !== c), page: 1 }) })),
    ...filters.families.map((f) => ({ label: f, href: buildCatalogHref(filters, { families: filters.families.filter((x) => x !== f), page: 1 }) })),
    ...filters.sizes.map((s) => ({ label: `${s} ml`, href: buildCatalogHref(filters, { sizes: filters.sizes.filter((x) => x !== s), page: 1 }) })),
    ...(filters.minCents !== undefined || filters.maxCents !== undefined
      ? [{
          label: `${filters.minCents !== undefined ? formatBRL(filters.minCents) : "R$ 0"} a ${filters.maxCents !== undefined ? formatBRL(filters.maxCents) : "sem limite"}`,
          href: buildCatalogHref(filters, { minCents: undefined, maxCents: undefined, page: 1 }),
        }]
      : []),
    ...(filters.inStock ? [{ label: "Apenas disponíveis", href: buildCatalogHref(filters, { inStock: false, page: 1 }) }] : []),
  ];
  if (chips.length === 0) return null;

  return (
    <ul aria-label="Filtros ativos" className="mb-6 flex flex-wrap gap-2">
      {chips.map((c) => (
        <li key={c.label}>
          <Link href={c.href} aria-label={`Remover filtro ${c.label}`} className="inline-flex items-center gap-2 rounded-full border border-gold/50 px-3 py-1 text-xs text-gold transition hover:bg-gold/10">
            {c.label}
            <span aria-hidden>×</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
