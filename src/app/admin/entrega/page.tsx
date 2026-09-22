import type { Metadata } from "next";
import Link from "next/link";
import { toggleDeliveryZoneAction } from "@/app/admin/entrega/actions";
import { formatBRL } from "@/lib/money";
import { requireAdmin } from "@/server/auth/guards";
import { listDeliveryZones } from "@/server/admin/delivery-zones";

export const metadata: Metadata = { title: "Entrega" };

export default async function AdminDeliveryPage() {
  await requireAdmin();
  const zones = await listDeliveryZones();

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="section-title">Zonas de entrega própria</h1>
        <Link href="/admin/entrega/nova" className="btn-primary">
          Nova zona
        </Link>
      </div>
      <p className="mb-8 text-sm text-muted">O CEP de origem e a cotação dos Correios são configurados por variável de ambiente (STORE_ORIGIN_CEP, MELHORENVIO_TOKEN).</p>

      {zones.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-10 text-center text-muted">Nenhuma zona cadastrada.</p>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {zones.map((z) => (
            <li key={z.id} className="rounded-2xl border border-line bg-surface p-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-serif text-xl text-ivory">{z.name}</p>
                <span className={z.active ? "text-xs text-gold" : "text-xs text-muted"}>{z.active ? "Ativa" : "Inativa"}</span>
              </div>
              <p className="text-sm text-ivory/75">
                Taxa: {formatBRL(z.feeCents)}
                {z.freeAboveCents !== null && ` · Grátis acima de ${formatBRL(z.freeAboveCents)}`}
                <br />
                {z.neighborhoods.length > 0 && `Bairros: ${z.neighborhoods.join(", ")}`}
                {z.ranges.length > 0 && (z.neighborhoods.length > 0 ? " · " : "") + `${z.ranges.length} faixa(s) de CEP`}
                <br />
                Pagamento na entrega: {z.allowsPayOnDelivery ? "sim" : "não"}
              </p>
              <div className="mt-4 flex gap-4 text-sm">
                <Link href={`/admin/entrega/${z.id}`} className="text-gold transition hover:text-gold-soft">
                  Editar
                </Link>
                <form action={toggleDeliveryZoneAction}>
                  <input type="hidden" name="id" value={z.id} />
                  <button type="submit" className="text-ivory/70 transition hover:text-gold">
                    {z.active ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
