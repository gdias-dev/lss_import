import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/conta/ChangePasswordForm";
import { ProfileForm } from "@/components/conta/ProfileForm";
import { formatPhone } from "@/lib/phone";
import { requireUser } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Meus dados" };

export default async function DadosPage() {
  const user = await requireUser("/conta/dados");
  return (
    <div className="max-w-xl space-y-14">
      <section>
        <h1 className="section-title mb-8">Meus dados</h1>
        <p className="mb-6 text-sm text-muted">
          E-mail: <span className="text-ivory">{user.email}</span> {user.emailVerifiedAt ? "(confirmado)" : "(não confirmado)"}
          <br />
          Para trocar o e-mail, fale com a loja.
        </p>
        <ProfileForm defaults={{ name: user.name, phone: user.phone ? formatPhone(user.phone) : "" }} />
      </section>
      <section>
        <h2 className="mb-6 font-serif text-2xl text-ivory">Alterar senha</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
