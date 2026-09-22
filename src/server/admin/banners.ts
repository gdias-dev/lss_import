import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/server/audit/log";

export const listAdminBanners = () => prisma.banner.findMany({ orderBy: { position: "asc" } });
export const getBanner = (id: string) => prisma.banner.findUnique({ where: { id } });

export interface BannerInput {
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  position: number;
  active: boolean;
}

export async function createBanner(adminId: string, input: BannerInput) {
  const banner = await prisma.banner.create({ data: input });
  await logAdminAction(adminId, "CREATE", "Banner", banner.id, null, banner);
}

export async function updateBanner(adminId: string, id: string, input: BannerInput) {
  const before = await prisma.banner.findUnique({ where: { id } });
  if (!before) throw new Error("Banner não encontrado.");
  const after = await prisma.banner.update({ where: { id }, data: input });
  await logAdminAction(adminId, "UPDATE", "Banner", id, before, after);
}

export async function deleteBanner(adminId: string, id: string) {
  const before = await prisma.banner.findUnique({ where: { id } });
  if (!before) return;
  await prisma.banner.delete({ where: { id } });
  await logAdminAction(adminId, "DELETE", "Banner", id, before, null);
}
