import type { Metadata } from "next";
import Link from "next/link";
import { DeleteAddressButton } from "@/components/conta/DeleteAddressButton";
import { formatCep } from "@/lib/cep";
import { deleteAddressAction, setDefaultAddressAction } from "@/app/conta/actions";
import { listAddresses, MAX_ADDRESSES } from "@/server/addresses";
import { requireUser } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Endereços" };

export default async function EnderecosPage() {
  const user = await requireUser("/conta/enderecos");
  const addresses = await listAddresses(user.id);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="section-title">Endereços</h1>
        {addresses.length < MAX_ADDRESSES && (
          <Link href="/conta/enderecos/novo" className="btn-primary">
            Adicionar endereço
          </Link>
        )}
      </div>

      {addresses.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-10 text-center text-muted">Você ainda não tem endereços cadastrados.</p>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="rounded-2xl border border-line bg-surface p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-serif text-xl text-ivory">{a.label || a.recipient}</p>
                {a.isDefault && <span className="rounded-full bg-gold/15 px-3 py-0.5 text-xs text-gold">Padrão</span>}
              </div>
              <p className="text-sm leading-relaxed text-ivory/75">
                {a.recipient}
                <br />
                {a.street}, {a.number}
                {a.complement ? ` - ${a.complement}` : ""}
                <br />
                {a.neighborhood} · {a.city}/{a.state}
                <br />
                CEP {formatCep(a.cep)}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                <Link href={`/conta/enderecos/${a.id}`} className="text-sm text-gold transition hover:text-gold-soft">
                  Editar
                </Link>
                {!a.isDefault && (
                  <form action={setDefaultAddressAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="text-sm text-ivory/80 transition hover:text-gold">
                      Tornar padrão
                    </button>
                  </form>
                )}
                <form action={deleteAddressAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <DeleteAddressButton />
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
