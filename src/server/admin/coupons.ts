import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/server/audit/log";

export const listCoupons = () => prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { brand: { select: { name: true } }, product: { select: { name: true } } } });
export const getCoupon = (id: string) => prisma.coupon.findUnique({ where: { id } });

export interface CouponInput {
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minSubtotalCents: number;
  maxUses: number | null;
  perUserLimit: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
}

export async function createCoupon(adminId: string, input: CouponInput) {
  const existing = await prisma.coupon.findUnique({ where: { code: input.code } });
  if (existing) throw new Error("Já existe um cupom com este código.");
  const coupon = await prisma.coupon.create({ data: input });
  await logAdminAction(adminId, "CREATE", "Coupon", coupon.id, null, coupon);
  return coupon;
}

export async function updateCoupon(adminId: string, id: string, input: CouponInput) {
  const before = await prisma.coupon.findUnique({ where: { id } });
  if (!before) throw new Error("Cupom não encontrado.");
  if (input.code !== before.code) {
    const clash = await prisma.coupon.findUnique({ where: { code: input.code } });
    if (clash) throw new Error("Já existe um cupom com este código.");
  }
  const after = await prisma.coupon.update({ where: { id }, data: input });
  await logAdminAction(adminId, "UPDATE", "Coupon", id, before, after);
  return after;
}

export async function toggleCoupon(adminId: string, id: string) {
  const before = await prisma.coupon.findUnique({ where: { id } });
  if (!before) return;
  const after = await prisma.coupon.update({ where: { id }, data: { active: !before.active } });
  await logAdminAction(adminId, after.active ? "ACTIVATE" : "DEACTIVATE", "Coupon", id, before, after);
}
