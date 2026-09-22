import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/server/audit/log";

export const listDeliveryZones = () => prisma.deliveryZone.findMany({ orderBy: { createdAt: "desc" }, include: { ranges: true } });
export const getDeliveryZone = (id: string) => prisma.deliveryZone.findUnique({ where: { id }, include: { ranges: true } });

export interface DeliveryZoneInput {
  name: string;
  feeCents: number;
  freeAboveCents: number | null;
  neighborhoods: string[];
  cepRanges: { cepStart: string; cepEnd: string }[];
  allowsPayOnDelivery: boolean;
  estimatedDays: number | null;
  active: boolean;
}

export async function createDeliveryZone(adminId: string, input: DeliveryZoneInput) {
  const { cepRanges, ...rest } = input;
  const zone = await prisma.deliveryZone.create({ data: { ...rest, ranges: { create: cepRanges } }, include: { ranges: true } });
  await logAdminAction(adminId, "CREATE", "DeliveryZone", zone.id, null, zone);
  return zone;
}

export async function updateDeliveryZone(adminId: string, id: string, input: DeliveryZoneInput) {
  const before = await prisma.deliveryZone.findUnique({ where: { id }, include: { ranges: true } });
  if (!before) throw new Error("Zona não encontrada.");
  const { cepRanges, ...rest } = input;
  const after = await prisma.$transaction(async (tx) => {
    await tx.deliveryZoneRange.deleteMany({ where: { zoneId: id } });
    return tx.deliveryZone.update({ where: { id }, data: { ...rest, ranges: { create: cepRanges } }, include: { ranges: true } });
  });
  await logAdminAction(adminId, "UPDATE", "DeliveryZone", id, before, after);
  return after;
}

export async function toggleDeliveryZone(adminId: string, id: string) {
  const before = await prisma.deliveryZone.findUnique({ where: { id } });
  if (!before) return;
  const after = await prisma.deliveryZone.update({ where: { id }, data: { active: !before.active } });
  await logAdminAction(adminId, after.active ? "ACTIVATE" : "DEACTIVATE", "DeliveryZone", id, before, after);
}
