import Link from "next/link";
import { ResendVerification } from "@/components/conta/ResendVerification";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/guards";

export default async function ContaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("/conta");
  const sp = await searchParams;
  const [addresses, orders] = await Promise.all([prisma.address.count({ where: { userId: user.id } }), prisma.order.count({ where: { userId: user.id } })]);
  const firstName = user.name.split(/\s+/)[0];

  const cards = [
    { href: "/conta/pedidos", title: "Meus pedidos", text: orders === 0 ? "Você ainda não fez pedidos." : `${orders} ${orders === 1 ? "pedido" : "pedidos"}` },
    { href: "/conta/enderecos", title: "Endereços", text: addresses === 0 ? "Nenhum endereço cadastrado." : `${addresses} ${addresses === 1 ? "endereço" : "endereços"}` },
    { href: "/conta/dados", title: "Meus dados", text: "Nome, telefone e senha." },
  ];

  return (
    <div>
      <p className="eyebrow mb-3">Minha conta</p>
      <h1 className="section-title mb-8">Olá, {firstName}</h1>

      {sp["boas-vindas"] && <p role="status" className="mb-6 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">Conta criada com sucesso. Bem-vindo(a) à LS Imports!</p>}
      {sp.verificado && <p role="status" className="mb-6 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">E-mail confirmado. Obrigado!</p>}

      {!user.emailVerifiedAt && (
        <section className="mb-8 rounded-2xl border border-gold/40 bg-gold/5 p-6">
          <h2 className="font-serif text-xl text-ivory">Confirme seu e-mail</h2>
          <p className="mt-2 text-sm text-ivory/75">
            Enviamos um link para <strong className="text-ivory">{user.email}</strong>. Você precisa confirmar o e-mail para finalizar compras.
          </p>
          <ResendVerification />
        </section>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="rounded-2xl border border-line bg-surface p-6 transition hover:border-gold/60">
            <h2 className="font-serif text-xl text-ivory">{c.title}</h2>
            <p className="mt-2 text-sm text-muted">{c.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
