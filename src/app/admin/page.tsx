import Link from "next/link";
import { formatBRL } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/guards";

export default async function AdminHomePage() {
  await requireAdmin();
  const since = new Date(Date.now() - 30 * 24 * 3_600_000);
  const [pendingOrders, lowStock, revenue30d, products, customers] = await Promise.all([
    prisma.order.count({ where: { status: { in: ["AGUARDANDO_PAGAMENTO", "AGUARDANDO_PAGAMENTO_NA_ENTREGA", "PAGO", "EM_SEPARACAO"] } } }),
    prisma.productVariant.count({ where: { active: true, stockQty: { gt: 0, lte: 3 } } }),
    prisma.order.aggregate({ where: { status: { in: ["PAGO", "EM_SEPARACAO", "ENVIADO", "ENTREGUE"] }, createdAt: { gte: since } }, _sum: { totalCents: true } }),
    prisma.product.count({ where: { active: true } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
  ]);

  const cards = [
    { href: "/admin/pedidos", title: "Pedidos em aberto", value: String(pendingOrders) },
    { href: "/admin/produtos?estoque=baixo", title: "Estoque baixo (≤ 3 un.)", value: String(lowStock) },
    { href: "/admin/pedidos", title: "Vendido nos últimos 30 dias", value: formatBRL(revenue30d._sum.totalCents ?? 0) },
    { href: "/admin/produtos", title: "Produtos ativos", value: String(products) },
    { href: "/admin/clientes", title: "Clientes cadastrados", value: String(customers) },
  ];

  return (
    <div>
      <p className="eyebrow mb-3">Painel</p>
      <h1 className="section-title mb-8">Resumo</h1>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.title} href={c.href} className="rounded-2xl border border-line bg-surface p-6 transition hover:border-gold/60">
            <p className="text-sm text-muted">{c.title}</p>
            <p className="mt-2 font-serif text-3xl text-ivory">{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
