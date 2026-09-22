import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { safeNextPath } from "@/lib/safe-redirect";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next, "");
  const user = await getCurrentUser();
  if (user) redirect(next || (user.role === "ADMIN" ? "/admin" : "/conta"));

  return (
    <>
      <h1 className="mb-2 font-serif text-3xl text-ivory">Criar conta</h1>
      <p className="mb-8 text-sm text-muted">Leva menos de um minuto. O CPF só é pedido na hora de pagar.</p>
      <RegisterForm next={next} />
      <p className="mt-8 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href={next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar"} className="text-gold hover:text-gold-soft">
          Entrar
        </Link>
      </p>
    </>
  );
}
