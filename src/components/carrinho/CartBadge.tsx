"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Ícone do carrinho com o número de unidades. Busca a contagem no navegador para o cabeçalho não ler cookies. */
export function CartBadge() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    fetch("/api/cart/count", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { count?: number } | null) => {
        if (active && d) setCount(Number(d.count) || 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    const onCount = (e: Event) => setCount(Number((e as CustomEvent<number>).detail) || 0);
    window.addEventListener("cart:count", onCount);
    return () => window.removeEventListener("cart:count", onCount);
  }, []);

  return (
    <Link href="/carrinho" aria-label={count > 0 ? `Carrinho, ${count} ${count === 1 ? "item" : "itens"}` : "Carrinho"} className="relative flex items-center text-ivory/85 transition hover:text-gold">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      {count > 0 && <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[0.65rem] font-semibold text-ink">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}
