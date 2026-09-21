import type { Metadata } from "next";
import { ContaNav } from "@/components/conta/ContaNav";

// Área do cliente nunca é pré-gerada: depende do cookie de cada pessoa.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "Minha conta", template: "%s | Minha conta" }, robots: { index: false } };

// A proteção de login fica em CADA página (requireUser): o layout não roda de novo na navegação entre páginas.
export default function ContaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page grid gap-10 py-14 lg:grid-cols-[14rem_1fr]">
      <aside>
        <ContaNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
