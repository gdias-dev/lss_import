import Image from "next/image";
import Link from "next/link";
import { cardPrice, type ProductCardData } from "@/lib/catalog";
import { bestInterestFreeLabel, formatBRL, type InstallmentRules } from "@/lib/money";

export function ProductCard({ product, rules }: { product: ProductCardData; rules: InstallmentRules }) {
  const { fromCents, compareAtCents, inStock, hasManyPrices } = cardPrice(product.variants);
  const image = product.images[0];
  const installment = fromCents ? bestInterestFreeLabel(fromCents, rules) : null;

  return (
    <Link href={`/produto/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-surface">
        {image ? (
          <Image src={image.url} alt={image.alt ?? product.name} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(201,164,92,0.16),transparent_70%)]">
            <span aria-hidden className="font-serif text-6xl text-gold/60">{product.brand.name.charAt(0)}</span>
          </div>
        )}
        {!inStock && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-3 py-1 text-xs tracking-wide text-muted">Esgotado</span>
        )}
      </div>
      <div className="mt-4 space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">{product.brand.name}</p>
        <h3 className="font-serif text-xl leading-snug text-ivory transition group-hover:text-gold">{product.name}</h3>
        {fromCents !== null && (
          <p className="text-sm text-ivory">
            {hasManyPrices && <span className="text-muted">a partir de </span>}
            <span className="font-medium">{formatBRL(fromCents)}</span>
            {compareAtCents && compareAtCents > fromCents && <span className="ml-2 text-muted line-through">{formatBRL(compareAtCents)}</span>}
          </p>
        )}
        {installment && <p className="text-xs text-gold">{installment}</p>}
      </div>
    </Link>
  );
}
