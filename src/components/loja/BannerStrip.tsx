import Image from "next/image";
import Link from "next/link";
import { hasDatabase } from "@/lib/env";
import { prisma } from "@/lib/prisma";

async function getActiveBanners() {
  if (!hasDatabase) return [];
  try {
    return await prisma.banner.findMany({ where: { active: true }, orderBy: { position: "asc" }, take: 6 });
  } catch (error) {
    console.error("[home] falha ao carregar banners", error);
    return [];
  }
}

/** Some por completo se não houver nenhum banner ativo (a home continua funcionando sem eles). */
export async function BannerStrip() {
  const banners = await getActiveBanners();
  if (banners.length === 0) return null;

  return (
    <section aria-label="Destaques" className="border-b border-line">
      <ul className={`container-page grid gap-4 py-8 ${banners.length === 1 ? "" : "sm:grid-cols-2"}`}>
        {banners.map((b) => {
          const image = (
            <div className="relative aspect-[21/9] overflow-hidden rounded-2xl border border-line">
              <Image src={b.imageUrl} alt={b.title ?? ""} fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
            </div>
          );
          return <li key={b.id}>{b.linkUrl ? <Link href={b.linkUrl}>{image}</Link> : image}</li>;
        })}
      </ul>
    </section>
  );
}
