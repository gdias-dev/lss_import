import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { toggleProductAction } from "@/app/admin/produtos/actions";
import { formatBRL } from "@/lib/money";
import { requireAdmin } from "@/server/auth/guards";
import { listAdminProducts } from "@/server/admin/products";

export const metadata: Metadata = { title: "Produtos" };

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const products = await listAdminProducts(q);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="section-title">Produtos</h1>
        <div className="flex gap-3">
          <Link href="/admin/produtos/importar" className="btn-outline">
            Importar/exportar CSV
          </Link>
          <Link href="/admin/produtos/novo" className="btn-primary">
            Novo produto
          </Link>
        </div>
      </div>

      <form action="/admin/produtos" className="mb-6">
        <input name="q" defaultValue={q ?? ""} placeholder="Buscar por nome ou marca" className="w-full max-w-sm rounded-full border border-line bg-surface px-4 py-2 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none" />
      </form>

      {products.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-10 text-center text-muted">Nenhum produto encontrado.</p>
      ) : (
        <ul className="space-y-3">
          {products.map((p) => {
            const totalStock = p.variants.reduce((sum, v) => sum + v.stockQty, 0);
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-ink-soft">
                  {p.images[0] ? (
                    <Image src={p.images[0].url} alt="" fill sizes="56px" className="object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center font-serif text-xl text-gold/60">{p.brand.name.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ivory">{p.name}</p>
                  <p className="text-sm text-muted">
                    {p.brand.name} · {p.variants.length} variação(ões) · estoque total {totalStock}
                    {!p.active && " · inativo"}
                    {p.featured && " · destaque"}
                  </p>
                </div>
                <div className="text-sm text-ivory/80">{p.variants[0] ? formatBRL(p.variants[0].priceCents) : "—"}</div>
                <div className="flex gap-4 text-sm">
                  <Link href={`/admin/produtos/${p.id}`} className="text-gold transition hover:text-gold-soft">
                    Editar
                  </Link>
                  <form action={toggleProductAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="text-ivory/70 transition hover:text-gold">
                      {p.active ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
