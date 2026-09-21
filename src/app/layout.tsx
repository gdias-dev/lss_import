import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/cormorant-garamond";
import "./globals.css";
import { AnnouncementBar } from "@/components/loja/AnnouncementBar";
import { Footer } from "@/components/loja/Footer";
import { Header } from "@/components/loja/Header";
import { WhatsAppFab } from "@/components/loja/WhatsAppFab";
import { siteUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "LS Imports | Perfumes e Importados", template: "%s | LS Imports" },
  description: "Perfumes e importados com qualidade, autenticidade e confiança. Enviamos para todo o Brasil.",
  openGraph: { type: "website", locale: "pt_BR", siteName: "LS Imports" },
};

export const viewport: Viewport = { themeColor: "#0b0b0c", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AnnouncementBar />
        <Header />
        <main id="conteudo">{children}</main>
        <Footer />
        <WhatsAppFab />
      </body>
    </html>
  );
}
