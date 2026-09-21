import Link from "next/link";
import { cn } from "@/lib/utils";

export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (page: number) => string }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2);
  const base = "rounded-full border px-4 py-2 text-sm transition";

  return (
    <nav aria-label="Paginação" className="mt-14 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} rel="prev" className={cn(base, "border-line text-ivory/80 hover:border-gold/60 hover:text-gold")}>
          Anterior
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - (pages[i - 1] ?? 0) > 1 && <span aria-hidden className="text-muted">…</span>}
          <Link href={hrefFor(p)} aria-current={p === page ? "page" : undefined} aria-label={`Página ${p}`} className={cn(base, p === page ? "border-gold bg-gold text-ink" : "border-line text-ivory/80 hover:border-gold/60 hover:text-gold")}>
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages && (
        <Link href={hrefFor(page + 1)} rel="next" className={cn(base, "border-line text-ivory/80 hover:border-gold/60 hover:text-gold")}>
          Próxima
        </Link>
      )}
    </nav>
  );
}
