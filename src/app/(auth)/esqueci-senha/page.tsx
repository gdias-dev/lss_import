import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Recuperar senha", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-2 font-serif text-3xl text-ivory">Recuperar senha</h1>
      <p className="mb-8 text-sm text-muted">Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
      <ForgotPasswordForm />
      <p className="mt-8 text-center text-sm text-muted">
        <Link href="/entrar" className="text-gold hover:text-gold-soft">
          Voltar para o login
        </Link>
      </p>
    </>
  );
}
