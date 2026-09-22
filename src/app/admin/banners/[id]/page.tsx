import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BannerForm } from "@/components/admin/BannerForm";
import { requireAdmin } from "@/server/auth/guards";
import { getBanner } from "@/server/admin/banners";

export const metadata: Metadata = { title: "Editar banner" };

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const banner = await getBanner(id);
  if (!banner) notFound();

  return (
    <div>
      <h1 className="section-title mb-8">Editar banner</h1>
      <BannerForm defaults={{ id: banner.id, title: banner.title ?? "", imageUrl: banner.imageUrl, linkUrl: banner.linkUrl ?? "", position: banner.position, active: banner.active }} />
    </div>
  );
}
