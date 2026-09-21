import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Nova senha", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="mb-2 font-serif text-3xl text-ivory">Criar nova senha</h1>
      {token ? (
        <>
          <p className="mb-8 text-sm text-muted">Escolha uma senha nova. Ao salvar, todos os aparelhos conectados serão desconectados.</p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <p className="text-sm text-muted">
          Link incompleto.{" "}
          <Link href="/esqueci-senha" className="text-gold hover:text-gold-soft">
            Peça um novo link
          </Link>
          .
        </p>
      )}
    </>
  );
}
