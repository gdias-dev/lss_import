import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { deleteBannerAction } from "@/app/admin/banners/actions";
import { requireAdmin } from "@/server/auth/guards";
import { listAdminBanners } from "@/server/admin/banners";

export const metadata: Metadata = { title: "Banners" };

export default async function AdminBannersPage() {
  await requireAdmin();
  const banners = await listAdminBanners();

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="section-title">Banners da home</h1>
        <Link href="/admin/banners/novo" className="btn-primary">
          Novo banner
        </Link>
      </div>

      {banners.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-10 text-center text-muted">Nenhum banner cadastrado. A home usa o texto padrão.</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {banners.map((b) => (
            <li key={b.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="relative h-32 w-full">
                <Image src={b.imageUrl} alt="" fill sizes="400px" className="object-cover" />
              </div>
              <div className="p-4">
                <p className="text-ivory">{b.title || "(sem título)"}</p>
                <p className="text-sm text-muted">Posição {b.position} · {b.active ? "Ativo" : "Inativo"}</p>
                <div className="mt-3 flex gap-4 text-sm">
                  <Link href={`/admin/banners/${b.id}`} className="text-gold transition hover:text-gold-soft">
                    Editar
                  </Link>
                  <form action={deleteBannerAction}>
                    <input type="hidden" name="id" value={b.id} />
                    <button type="submit" onClick={(e) => confirm("Remover este banner?") || e.preventDefault()} className="text-muted transition hover:text-red-300">
                      Remover
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
