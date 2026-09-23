import Link from "next/link";
import { BannerStrip } from "@/components/loja/BannerStrip";
import { ProductCard } from "@/components/loja/ProductCard";
import { listProducts } from "@/lib/catalog";
import { getWhatsAppNumber } from "@/lib/env";
import { installmentRules, getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/env";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const revalidate = 60;

const CATEGORIES = [
  { href: "/perfumes?genero=feminino", title: "Femininos", text: "Florais, gourmands e orientais" },
  { href: "/perfumes?genero=masculino", title: "Masculinos", text: "Amadeirados, aromáticos e intensos" },
  { href: "/perfumes?genero=unissex", title: "Unissex", text: "Fragrâncias para todos" },
];

export default async function HomePage() {
  const [settings, initialProducts] = await Promise.all([getSettings(), listProducts({ featured: true, take: 8 })]);
  const rules = installmentRules(settings);
  const whatsapp = getWhatsAppNumber();

  let products = initialProducts;
  if (products.length === 0) products = await listProducts({ take: 8 });

  const benefits = [
    { title: "Autenticidade e confiança", text: "Perfumes selecionados com qualidade em cada fragrância." },
    {
      title: "Parcelamento",
      text: settings.installmentsInterestFreeMax > 1 ? `Em até ${settings.installmentsInterestFreeMax}x sem juros no cartão.` : "Pague no cartão de crédito ou débito.",
    },
    { title: "Pix", text: settings.pixDiscountPercent > 0 ? `${settings.pixDiscountPercent}% de desconto pagando com Pix.` : "Pagamento rápido e seguro com Pix." },
    { title: "Entrega para todo o Brasil", text: "Frete calculado automaticamente pelo seu CEP." },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: settings.storeName,
    url: siteUrl,
    ...(settings.instagramUrl ? { sameAs: [settings.instagramUrl] } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="relative overflow-hidden border-b border-line bg-[radial-gradient(ellipse_at_top,rgba(201,164,92,0.18),transparent_60%)]">
        <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
          <p className="eyebrow mb-6">Perfumes &amp; Importados</p>
          <h1 className="max-w-3xl font-serif text-5xl font-semibold leading-[1.05] tracking-wide text-ivory sm:text-6xl lg:text-7xl">
            Fragrâncias que contam a sua <span className="text-gold">história</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-ivory/75">
            Uma seleção de perfumes importados para todos os estilos, com qualidade, autenticidade e confiança.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/perfumes" className="btn-primary">Ver perfumes</Link>
            {whatsapp && (
              <a href={buildWhatsAppLink(whatsapp, "Olá! Gostaria de ajuda para escolher um perfume.")} target="_blank" rel="noopener noreferrer" className="btn-outline">
                Falar no WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      <BannerStrip />

      <section aria-label="Diferenciais" className="border-b border-line">
        <ul className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <li key={b.title} className="space-y-1">
              <p className="text-sm font-medium text-gold">{b.title}</p>
              <p className="text-sm text-muted">{b.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page py-20">
        <div className="mb-10 text-center">
          <p className="eyebrow mb-3">Explore</p>
          <h2 className="section-title">Escolha pelo seu estilo</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link key={c.href} href={c.href} className="group relative flex aspect-[5/4] flex-col justify-end overflow-hidden rounded-2xl border border-line bg-surface p-6 transition hover:border-gold/60">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,164,92,0.22),transparent_65%)] transition group-hover:opacity-80" />
              <h3 className="relative font-serif text-3xl text-ivory">{c.title}</h3>
              <p className="relative mt-1 text-sm text-muted">{c.text}</p>
              <span className="relative mt-4 text-sm text-gold">Ver coleção →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page pb-4">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">Seleção</p>
            <h2 className="section-title">Destaques</h2>
          </div>
          <Link href="/perfumes" className="text-sm text-gold transition hover:text-gold-soft">Ver todos →</Link>
        </div>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} rules={rules} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-line bg-surface p-10 text-center text-muted">Novos perfumes chegando em breve.</p>
        )}
      </section>
    </>
  );
}
