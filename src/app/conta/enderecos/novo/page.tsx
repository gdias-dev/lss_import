import type { Metadata } from "next";
import { AddressForm, EMPTY_ADDRESS } from "@/components/conta/AddressForm";
import { listAddresses, MAX_ADDRESSES } from "@/server/addresses";
import { requireUser } from "@/server/auth/guards";
import Link from "next/link";

export const metadata: Metadata = { title: "Novo endereço" };

export default async function NovoEnderecoPage() {
  const user = await requireUser("/conta/enderecos/novo");
  const count = (await listAddresses(user.id)).length;

  return (
    <div className="max-w-2xl">
      <h1 className="section-title mb-8">Novo endereço</h1>
      {count >= MAX_ADDRESSES ? (
        <p className="text-muted">
          Você atingiu o limite de {MAX_ADDRESSES} endereços.{" "}
          <Link href="/conta/enderecos" className="text-gold hover:text-gold-soft">
            Gerenciar endereços
          </Link>
        </p>
      ) : (
        <AddressForm defaults={{ ...EMPTY_ADDRESS, isDefault: count === 0 }} forceDefault={count === 0} />
      )}
    </div>
  );
}
