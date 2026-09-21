import Link from "next/link";
import { activeFilterCount, buildCatalogHref, type CatalogFacets, type CatalogFilters } from "@/lib/catalog-filters";
import { AutoSubmitForm } from "./AutoSubmitForm";

interface Option {
  value: string;
  label: string;
  count: number;
}

function FacetGroup({ legend, name, options, selected }: { legend: string; name: string; options: Option[]; selected: string[] }) {
  if (options.length === 0) return null;
  return (
    <fieldset>
      <legend className="eyebrow mb-3">{legend}</legend>
      <ul className="max-h-60 space-y-2 overflow-y-auto pr-1">
        {options.map((o) => (
          <li key={o.value}>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-ivory/85 transition hover:text-gold">
              <span className="flex items-center gap-3">
                <input type="checkbox" name={name} value={o.value} defaultChecked={selected.includes(o.value)} className="h-4 w-4 accent-[var(--color-gold)]" />
                {o.label}
              </span>
              <span className="text-xs text-muted">{o.count}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

export function FilterPanel({ filters, facets }: { filters: CatalogFilters; facets: CatalogFacets }) {
  const hasFilters = activeFilterCount(filters) > 0;
  const clearHref = buildCatalogHref({ ...filters, genders: [], brands: [], concentrations: [], families: [], sizes: [], minCents: undefined, maxCents: undefined, inStock: false, page: 1 });
  const inputClass = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none";

  return (
    // key: recria o formulário quando a URL muda (ex.: ao remover um filtro pelas etiquetas), mantendo as caixas em dia
    <AutoSubmitForm key={buildCatalogHref(filters)} action="/perfumes" className="space-y-8">
      {filters.q && <input type="hidden" name="q" value={filters.q} />}
      {filters.sort !== "relevancia" && <input type="hidden" name="ordem" value={filters.sort} />}

      <FacetGroup legend="Gênero" name="genero" options={facets.genders.map((o) => ({ ...o, value: o.value.toLowerCase() }))} selected={filters.genders.map((g) => g.toLowerCase())} />
      <FacetGroup legend="Marca" name="marca" options={facets.brands} selected={filters.brands} />
      <FacetGroup legend="Concentração" name="conc" options={facets.concentrations.map((o) => ({ ...o, value: o.value.toLowerCase() }))} selected={filters.concentrations.map((c) => c.toLowerCase())} />
      <FacetGroup legend="Família olfativa" name="familia" options={facets.families} selected={filters.families} />
      <FacetGroup legend="Tamanho" name="tam" options={facets.sizes.map((o) => ({ ...o, value: String(o.value) }))} selected={filters.sizes.map(String)} />

      <fieldset>
        <legend className="eyebrow mb-3">Preço (R$)</legend>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="preco-min">Preço mínimo</label>
          <input id="preco-min" name="min" type="number" inputMode="decimal" min={0} step={1} defaultValue={filters.minCents !== undefined ? filters.minCents / 100 : ""} placeholder={facets.price ? String(Math.floor(facets.price.minCents / 100)) : "Mín."} className={inputClass} />
          <span aria-hidden className="text-muted">a</span>
          <label className="sr-only" htmlFor="preco-max">Preço máximo</label>
          <input id="preco-max" name="max" type="number" inputMode="decimal" min={0} step={1} defaultValue={filters.maxCents !== undefined ? filters.maxCents / 100 : ""} placeholder={facets.price ? String(Math.ceil(facets.price.maxCents / 100)) : "Máx."} className={inputClass} />
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-center gap-3 text-sm text-ivory/85">
        <input type="checkbox" name="estoque" value="1" defaultChecked={filters.inStock} className="h-4 w-4 accent-[var(--color-gold)]" />
        Apenas disponíveis
      </label>

      <div className="space-y-3">
        <button type="submit" className="btn-primary w-full">Aplicar filtros</button>
        {hasFilters && (
          <Link href={clearHref} className="block text-center text-sm text-muted transition hover:text-gold">
            Limpar filtros
          </Link>
        )}
      </div>
    </AutoSubmitForm>
  );
}
