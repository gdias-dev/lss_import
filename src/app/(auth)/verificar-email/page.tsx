import type { Metadata } from "next";
import Link from "next/link";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

export const metadata: Metadata = { title: "Confirmar e-mail", robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="mb-2 font-serif text-3xl text-ivory">Confirmar e-mail</h1>
      {token ? (
        <>
          <p className="mb-8 text-sm text-muted">Falta só um clique para confirmar o seu e-mail.</p>
          <VerifyEmailForm token={token} />
        </>
      ) : (
        <p className="text-sm text-muted">
          Link incompleto.{" "}
          <Link href="/conta" className="text-gold hover:text-gold-soft">
            Entre na sua conta
          </Link>{" "}
          para receber um novo e-mail de confirmação.
        </p>
      )}
    </>
  );
}
