import Link from "next/link";
import { NAV_LINKS } from "@/lib/nav";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";

// O link da conta é fixo (/conta manda para o login se preciso): assim o cabeçalho não lê cookies e as páginas continuam em cache.
// O ícone do carrinho entra na Etapa 5.
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <MobileMenu links={NAV_LINKS} />
          <Link href="/" aria-label="LS Imports, página inicial">
            <Logo />
          </Link>
        </div>
        <nav aria-label="Principal" className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm tracking-wide text-ivory/80 transition hover:text-gold">
              {l.label}
            </Link>
          ))}
        </nav>
        <form action="/perfumes" role="search">
          <label htmlFor="q" className="sr-only">
            Buscar perfumes
          </label>
          <input
            id="q"
            name="q"
            type="search"
            placeholder="Buscar perfume ou marca"
            className="w-36 rounded-full border border-line bg-surface px-4 py-2 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none sm:w-60"
          />
        </form>
        <Link href="/conta" aria-label="Minha conta" className="flex items-center gap-2 text-sm text-ivory/85 transition hover:text-gold">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5" />
          </svg>
          <span className="hidden lg:inline">Minha conta</span>
        </Link>
      </div>
    </header>
  );
}
