import type { Metadata } from "next";
import { Pagination } from "@/components/loja/Pagination";
import { formatBRL } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Clientes" };
const PAGE_SIZE = 20;

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const where = { role: "CUSTOMER" as const, ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" as const } }, { email: { contains: sp.q, mode: "insensitive" as const } }] } : {}) };

  const [customers, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: { id: true, name: true, email: true, createdAt: true, orders: { select: { totalCents: true, status: true } } } }),
    prisma.user.count({ where }),
  ]);

  return (
    <div>
      <h1 className="section-title mb-2">Clientes</h1>
      <p className="mb-6 text-sm text-muted">{total} cliente(s)</p>

      <form action="/admin/clientes" className="mb-6">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Buscar por nome ou e-mail" className="w-full max-w-sm rounded-full border border-line bg-surface px-4 py-2 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none" />
      </form>

      {customers.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-10 text-center text-muted">Nenhum cliente encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-surface text-left text-muted">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Desde</th>
                <th className="px-4 py-3">Pedidos</th>
                <th className="px-4 py-3">Total comprado</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const paid = c.orders.filter((o) => !["CANCELADO", "REEMBOLSADO"].includes(o.status));
                return (
                  <tr key={c.id} className="border-t border-line">
                    <td className="px-4 py-3 text-ivory">{c.name}</td>
                    <td className="px-4 py-3 text-ivory/80">{c.email}</td>
                    <td className="px-4 py-3 text-ivory/80">{c.createdAt.toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-ivory/80">{paid.length}</td>
                    <td className="px-4 py-3 text-ivory/80">{formatBRL(paid.reduce((sum, o) => sum + o.totalCents, 0))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} hrefFor={(p) => `/admin/clientes?pagina=${p}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} />
    </div>
  );
}
