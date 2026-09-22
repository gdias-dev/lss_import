import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { safeNextPath } from "@/lib/safe-redirect";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; redefinida?: string; verificado?: string }> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next, "");
  const user = await getCurrentUser();
  if (user) redirect(next || (user.role === "ADMIN" ? "/admin" : "/conta"));

  return (
    <>
      <h1 className="mb-2 font-serif text-3xl text-ivory">Entrar</h1>
      <p className="mb-8 text-sm text-muted">Acesse sua conta para comprar e acompanhar seus pedidos.</p>
      {sp.redefinida && <p role="status" className="mb-6 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">Senha alterada. Entre com a nova senha.</p>}
      {sp.verificado && <p role="status" className="mb-6 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">E-mail confirmado. Agora é só entrar.</p>}
      <LoginForm next={next} />
      <p className="mt-8 text-center text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link href={next ? `/cadastrar?next=${encodeURIComponent(next)}` : "/cadastrar"} className="text-gold hover:text-gold-soft">
          Criar conta
        </Link>
      </p>
    </>
  );
}
