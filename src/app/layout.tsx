import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/cormorant-garamond";
import "./globals.css";
import { AnnouncementBar } from "@/components/loja/AnnouncementBar";
import { CookieNotice } from "@/components/loja/CookieNotice";
import { Footer } from "@/components/loja/Footer";
import { Header } from "@/components/loja/Header";
import { WhatsAppFab } from "@/components/loja/WhatsAppFab";
import { siteUrl } from "@/lib/env";
import { buildWebsiteSchema, toJsonLdScript } from "@/lib/structured-data";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "LS Imports | Perfumes e Importados", template: "%s | LS Imports" },
  description: "Perfumes e importados com qualidade, autenticidade e confiança. Enviamos para todo o Brasil.",
  openGraph: { type: "website", locale: "pt_BR", siteName: "LS Imports" },
};

export const viewport: Viewport = { themeColor: "#0b0b0c", colorScheme: "dark" };

// O WebSite (caixa de busca nos resultados do Google) fica aqui, uma vez para o site inteiro.
// A entidade da loja em si (Organization/OnlineStore) já é declarada na home (src/app/page.tsx),
// para não duplicar a mesma entidade em dois lugares com formatos diferentes.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const websiteSchema = buildWebsiteSchema(siteUrl);

  return (
    <html lang="pt-BR">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLdScript(websiteSchema) }} />
        <AnnouncementBar />
        <Header />
        <main id="conteudo">{children}</main>
        <Footer />
        <WhatsAppFab />
        <CookieNotice />
      </body>
    </html>
  );
}
