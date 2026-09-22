import type { Metadata } from "next";
import Link from "next/link";
import { formatBRL } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { prisma } from "@/lib/prisma";
import { formatOrderNumber } from "@/lib/whatsapp";
import { requireUser } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Meus pedidos" };

// Detalhe do pedido, rastreio e segunda via do Pix entram na Etapa 6, junto com a criação de pedidos.
export default async function PedidosPage() {
  const user = await requireUser("/conta/pedidos");
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, number: true, status: true, totalCents: true, createdAt: true, _count: { select: { items: true } } },
  });

  return (
    <div>
      <h1 className="section-title mb-8">Meus pedidos</h1>
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center">
          <p className="mb-5 text-muted">Você ainda não fez nenhum pedido.</p>
          <Link href="/perfumes" className="btn-primary">
            Ver perfumes
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/conta/pedidos/${o.id}`} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-6 transition hover:border-gold/60">
                <div>
                  <p className="font-serif text-xl text-ivory">Pedido {formatOrderNumber(o.number)}</p>
                  <p className="mt-1 text-sm text-muted">
                    {o.createdAt.toLocaleDateString("pt-BR")} · {o._count.items} {o._count.items === 1 ? "item" : "itens"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-ivory">{formatBRL(o.totalCents)}</p>
                  <p className="mt-1 text-sm text-gold">{ORDER_STATUS_LABEL[o.status] ?? o.status}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
