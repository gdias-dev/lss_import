import type { Metadata } from "next";
import Link from "next/link";
import { toggleCouponAction } from "@/app/admin/cupons/actions";
import { formatBRL } from "@/lib/money";
import { requireAdmin } from "@/server/auth/guards";
import { listCoupons } from "@/server/admin/coupons";

export const metadata: Metadata = { title: "Cupons" };

const TYPE_LABEL: Record<string, string> = { PERCENT: "Percentual", FIXED: "Valor fixo", FREE_SHIPPING: "Frete grátis" };

export default async function AdminCouponsPage() {
  await requireAdmin();
  const coupons = await listCoupons();

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="section-title">Cupons</h1>
        <Link href="/admin/cupons/novo" className="btn-primary">
          Novo cupom
        </Link>
      </div>

      {coupons.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-10 text-center text-muted">Nenhum cupom cadastrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface text-left text-muted">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Usos</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium text-ivory">{c.code}</td>
                  <td className="px-4 py-3 text-ivory/80">{TYPE_LABEL[c.type]}</td>
                  <td className="px-4 py-3 text-ivory/80">{c.type === "PERCENT" ? `${c.value}%` : c.type === "FIXED" ? formatBRL(c.value) : "—"}</td>
                  <td className="px-4 py-3 text-ivory/80">
                    {c.usedCount}
                    {c.maxUses ? ` / ${c.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className={c.active ? "text-gold" : "text-muted"}>{c.active ? "Ativo" : "Pausado"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-4">
                      <Link href={`/admin/cupons/${c.id}`} className="text-gold transition hover:text-gold-soft">
                        Editar
                      </Link>
                      <form action={toggleCouponAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="text-ivory/70 transition hover:text-gold">
                          {c.active ? "Pausar" : "Ativar"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
