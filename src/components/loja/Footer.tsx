import Link from "next/link";
import { getWhatsAppNumber } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Logo } from "./Logo";

export async function Footer() {
  const s = await getSettings();
  const whatsapp = getWhatsAppNumber();
  const linkClass = "text-sm text-muted transition hover:text-gold";
  return (
    <footer className="mt-24 border-t border-line bg-ink-soft">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo className="items-start" />
          <p className="max-w-xs text-sm leading-relaxed text-muted">Perfumes e importados com qualidade, autenticidade e confiança.</p>
        </div>
        <nav aria-label="Perfumes">
          <h2 className="eyebrow mb-4">Perfumes</h2>
          <ul className="space-y-2">
            <li><Link className={linkClass} href="/perfumes?genero=feminino">Femininos</Link></li>
            <li><Link className={linkClass} href="/perfumes?genero=masculino">Masculinos</Link></li>
            <li><Link className={linkClass} href="/perfumes?genero=unissex">Unissex</Link></li>
          </ul>
        </nav>
        <nav aria-label="Institucional">
          <h2 className="eyebrow mb-4">Informações</h2>
          <ul className="space-y-2">
            <li><Link className={linkClass} href="/trocas-e-devolucoes">Trocas e devoluções</Link></li>
            <li><Link className={linkClass} href="/privacidade">Política de privacidade</Link></li>
            <li><Link className={linkClass} href="/termos">Termos de uso</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="eyebrow mb-4">Contato</h2>
          <ul className="space-y-2">
            {whatsapp && (
              <li>
                <a className={linkClass} href={buildWhatsAppLink(whatsapp)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              </li>
            )}
            <li>
              <a className={linkClass} href={s.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram @lss.import</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-muted sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {s.storeName}. Todos os direitos reservados.</p>
          {s.cnpj && <p>CNPJ {s.cnpj}</p>}
        </div>
      </div>
    </footer>
  );
}
