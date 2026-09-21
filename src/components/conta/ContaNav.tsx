"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/conta", label: "Resumo" },
  { href: "/conta/pedidos", label: "Meus pedidos" },
  { href: "/conta/enderecos", label: "Endereços" },
  { href: "/conta/dados", label: "Meus dados" },
];

export function ContaNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Minha conta" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
      {ITEMS.map((item) => {
        const active = item.href === "/conta" ? pathname === "/conta" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm transition lg:rounded-xl", active ? "bg-gold/15 text-gold" : "text-ivory/80 hover:text-gold")}>
            {item.label}
          </Link>
        );
      })}
      <form action={logoutAction} className="lg:mt-4">
        <button type="submit" className="whitespace-nowrap rounded-full px-4 py-2 text-sm text-muted transition hover:text-gold lg:rounded-xl">
          Sair
        </button>
      </form>
    </nav>
  );
}
