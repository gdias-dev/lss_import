import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddressForm } from "@/components/conta/AddressForm";
import { getAddress } from "@/server/addresses";
import { requireUser } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Editar endereço" };

export default async function EditarEnderecoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/conta/enderecos/${id}`);
  const address = await getAddress(user.id, id);
  if (!address) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="section-title mb-8">Editar endereço</h1>
      <AddressForm
        id={address.id}
        forceDefault={address.isDefault}
        defaults={{
          label: address.label ?? "",
          recipient: address.recipient,
          cep: address.cep,
          street: address.street,
          number: address.number,
          complement: address.complement ?? "",
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          isDefault: address.isDefault,
        }}
      />
    </div>
  );
}
