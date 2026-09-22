"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Resumo" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/cupons", label: "Cupons" },
  { href: "/admin/entrega", label: "Entrega" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/config", label: "Configurações" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Painel administrativo" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {ITEMS.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm transition lg:rounded-xl", active ? "bg-gold/15 text-gold" : "text-ivory/80 hover:text-gold")}>
            {item.label}
          </Link>
        );
      })}
      <Link href="/" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap rounded-full px-4 py-2 text-sm text-muted transition hover:text-gold lg:rounded-xl">
        Ver a loja ↗
      </Link>
      <form action={logoutAction} className="lg:mt-2">
        <button type="submit" className="whitespace-nowrap rounded-full px-4 py-2 text-sm text-muted transition hover:text-gold lg:rounded-xl">
          Sair
        </button>
      </form>
    </nav>
  );
}
