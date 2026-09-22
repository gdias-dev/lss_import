import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/loja/Pagination";
import { formatBRL } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { formatOrderNumber } from "@/lib/whatsapp";
import { requireAdmin } from "@/server/auth/guards";
import { listAdminOrders } from "@/server/admin/orders";

export const metadata: Metadata = { title: "Pedidos" };

const STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABEL);

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; pagina?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const { orders, total, totalPages } = await listAdminOrders({ status: sp.status, q: sp.q, page });

  return (
    <div>
      <h1 className="section-title mb-2">Pedidos</h1>
      <p className="mb-6 text-sm text-muted">{total} pedido(s)</p>

      <form action="/admin/pedidos" className="mb-6 flex flex-wrap gap-3">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Buscar por cliente ou e-mail" className="min-w-48 flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none" />
        <select name="status" defaultValue={sp.status ?? ""} className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-ivory focus:border-gold focus:outline-none">
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-outline">
          Filtrar
        </button>
      </form>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-10 text-center text-muted">Nenhum pedido encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface text-left text-muted">
              <tr>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link href={`/admin/pedidos/${o.id}`} className="font-medium text-gold transition hover:text-gold-soft">
                      {formatOrderNumber(o.number)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ivory/80">{o.user.name}</td>
                  <td className="px-4 py-3 text-ivory/80">{o.createdAt.toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3 text-ivory/80">{formatBRL(o.totalCents)}</td>
                  <td className="px-4 py-3 text-ivory/80">{ORDER_STATUS_LABEL[o.status] ?? o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/admin/pedidos?pagina=${p}${sp.status ? `&status=${sp.status}` : ""}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} />
    </div>
  );
}
