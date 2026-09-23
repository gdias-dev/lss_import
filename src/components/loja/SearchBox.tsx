"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { formatBRL } from "@/lib/money";

interface Suggestion {
  slug: string;
  name: string;
  brandName: string;
  imageUrl: string | null;
  priceFromCents: number | null;
}

const DEBOUNCE_MS = 250;

/** Caixa de busca do cabeçalho: sugere perfumes conforme a pessoa digita, sem precisar apertar Enter. */
export function SearchBox() {
  const router = useRouter();
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    const trimmed = query.trim();
    clearTimeout(debounceRef.current);
    if (trimmed.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { suggestions: [] }))
        .then((data: { suggestions?: Suggestion[] }) => {
          setSuggestions(data.suggestions ?? []);
          setOpen(true);
          setActiveIndex(-1);
        })
        .catch(() => {
          // requisição cancelada (nova digitação) ou falha de rede momentânea: não faz nada
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function goToResults() {
    setOpen(false);
    router.push(`/perfumes?q=${encodeURIComponent(query.trim())}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const chosen = suggestions[activeIndex];
      if (chosen) {
        setOpen(false);
        router.push(`/produto/${chosen.slug}`);
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <form
        action="/perfumes"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          goToResults();
        }}
      >
        <label htmlFor="q" className="sr-only">
          Buscar perfumes
        </label>
        <input
          id="q"
          name="q"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Buscar perfume ou marca"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className="w-36 rounded-full border border-line bg-surface px-4 py-2 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none sm:w-60"
        />
      </form>

      {open && suggestions.length > 0 && (
        <ul id={listboxId} role="listbox" className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-ink-soft shadow-xl sm:w-80">
          {suggestions.map((s, i) => (
            <li key={s.slug} role="option" aria-selected={i === activeIndex}>
              <Link
                href={`/produto/${s.slug}`}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition ${i === activeIndex ? "bg-gold/10" : "hover:bg-surface"}`}
              >
                <span className="relative h-10 w-9 shrink-0 overflow-hidden rounded-md border border-line bg-surface">
                  {s.imageUrl ? (
                    <Image src={s.imageUrl} alt="" fill sizes="36px" className="object-cover" />
                  ) : (
                    <span aria-hidden className="flex h-full items-center justify-center font-serif text-sm text-gold/60">
                      {s.brandName.charAt(0)}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ivory">{s.name}</span>
                  <span className="block truncate text-xs text-muted">{s.brandName}</span>
                </span>
                {s.priceFromCents !== null && <span className="shrink-0 text-xs text-ivory/80">{formatBRL(s.priceFromCents)}</span>}
              </Link>
            </li>
          ))}
          <li className="border-t border-line">
            <button type="button" onClick={goToResults} className="block w-full px-4 py-3 text-left text-sm text-gold transition hover:bg-surface">
              Ver todos os resultados para &ldquo;{query.trim()}&rdquo;
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
