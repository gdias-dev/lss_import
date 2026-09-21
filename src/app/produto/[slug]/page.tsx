import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/loja/ProductCard";
import { ProductGallery } from "@/components/loja/ProductGallery";
import { ProductPurchase } from "@/components/loja/ProductPurchase";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { CONCENTRATION_LABEL, GENDER_LABEL } from "@/lib/catalog-filters";
import { getWhatsAppNumber } from "@/lib/env";
import { installmentRules, getSettings } from "@/lib/settings";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: `${product.name} ${product.brand.name}`,
    description: product.seoDescription ?? product.description?.slice(0, 155) ?? `${product.name} da ${product.brand.name}.`,
    alternates: { canonical: `/produto/${product.slug}` },
  };
}

// Frete por CEP (Etapa 7), carrinho (Etapa 5) e avaliações (Fase 2) entram aqui depois.
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [settings, related] = await Promise.all([getSettings(), getRelatedProducts(product)]);
  const rules = installmentRules(settings);
  const prices = product.variants.map((v) => v.priceCents);
  const inStock = product.variants.some((v) => v.stockQty > 0);

  const notes = [
    ["Topo", product.notesTop],
    ["Coração", product.notesHeart],
    ["Fundo", product.notesBase],
  ].filter((n): n is [string, string] => Boolean(n[1]));
  const details = [
    ["Concentração", CONCENTRATION_LABEL[product.concentration]],
    ["Fixação", product.longevity],
    ["Projeção", product.projection],
    ["Ocasião", product.occasion],
  ].filter((d): d is [string, string] => Boolean(d[1]));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: { "@type": "Brand", name: product.brand.name },
    description: product.description ?? undefined,
    image: product.images.map((i) => i.url),
    offers: prices.length
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "BRL",
          lowPrice: (Math.min(...prices) / 100).toFixed(2),
          highPrice: (Math.max(...prices) / 100).toFixed(2),
          offerCount: prices.length,
          availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        }
      : undefined,
  };

  return (
    <div className="container-page py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav aria-label="Você está em" className="mb-8 text-xs text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/" className="transition hover:text-gold">Início</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/perfumes" className="transition hover:text-gold">Perfumes</Link></li>
          <li aria-hidden>/</li>
          <li><Link href={`/perfumes?marca=${product.brand.slug}`} className="transition hover:text-gold">{product.brand.name}</Link></li>
        </ol>
      </nav>

      <div className="grid gap-12 lg:grid-cols-2">
        <ProductGallery images={product.images.map((i) => ({ url: i.url, alt: i.alt }))} name={product.name} initial={product.brand.name.charAt(0)} />

        <div>
          <p className="eyebrow mb-3">{product.brand.name}</p>
          <h1 className="section-title mb-3">{product.name}</h1>
          <p className="mb-8 text-sm text-muted">
            {GENDER_LABEL[product.gender]}
            {product.olfactoryFamily ? ` · ${product.olfactoryFamily}` : ""}
          </p>

          <ProductPurchase
            productName={product.name}
            brandName={product.brand.name}
            variants={product.variants.map((v) => ({ id: v.id, label: v.label, sizeMl: v.sizeMl, priceCents: v.priceCents, compareAtCents: v.compareAtCents, stockQty: v.stockQty }))}
            rules={rules}
            pixDiscountPercent={settings.pixDiscountPercent}
            whatsappNumber={getWhatsAppNumber()}
          />

          {product.description && <p className="mt-10 leading-relaxed text-ivory/80">{product.description}</p>}

          {notes.length > 0 && (
            <dl className="mt-8 grid grid-cols-3 gap-4 rounded-2xl border border-line bg-surface p-5">
              {notes.map(([label, value]) => (
                <div key={label}>
                  <dt className="eyebrow mb-1 !text-[0.65rem]">{label}</dt>
                  <dd className="text-sm text-ivory/80">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {details.length > 0 && (
            <dl className="mt-4 grid grid-cols-2 gap-4 rounded-2xl border border-line p-5">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="eyebrow mb-1 !text-[0.65rem]">{label}</dt>
                  <dd className="text-sm text-ivory/80">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24" aria-label="Você também pode gostar">
          <h2 className="section-title mb-10">Você também pode gostar</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} rules={rules} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
