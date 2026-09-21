import { prisma } from "@/lib/prisma";

export const MAX_ADDRESSES = 10;

export interface AddressInput {
  label?: string;
  recipient: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  isDefault: boolean;
}

export const listAddresses = (userId: string) => prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
export const getAddress = (userId: string, id: string) => prisma.address.findFirst({ where: { id, userId } });

type SaveResult = { ok: true; id: string } | { ok: false; reason: "LIMIT" | "NOT_FOUND" };

/** Toda consulta filtra por userId: um cliente nunca mexe no endereço de outro. */
export async function saveAddress(userId: string, input: AddressInput, id?: string): Promise<SaveResult> {
  return prisma.$transaction(async (tx): Promise<SaveResult> => {
    const count = await tx.address.count({ where: { userId } });
    const existing = id ? await tx.address.findFirst({ where: { id, userId }, select: { id: true, isDefault: true } }) : null;
    if (id && !existing) return { ok: false, reason: "NOT_FOUND" };
    if (!id && count >= MAX_ADDRESSES) return { ok: false, reason: "LIMIT" };

    // o primeiro endereço é sempre o padrão, e o padrão atual não fica sem padrão ao ser editado
    const isDefault = input.isDefault || (!id && count === 0) || Boolean(existing?.isDefault);
    if (isDefault) await tx.address.updateMany({ where: { userId, ...(id ? { id: { not: id } } : {}) }, data: { isDefault: false } });

    const data = {
      label: input.label ?? null,
      recipient: input.recipient,
      cep: input.cep,
      street: input.street,
      number: input.number,
      complement: input.complement ?? null,
      neighborhood: input.neighborhood,
      city: input.city,
      state: input.state,
      isDefault,
    };
    if (id) {
      await tx.address.update({ where: { id }, data });
      return { ok: true, id };
    }
    const created = await tx.address.create({ data: { ...data, userId } });
    return { ok: true, id: created.id };
  });
}

export async function deleteAddress(userId: string, id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.address.findFirst({ where: { id, userId }, select: { isDefault: true } });
    if (!existing) return;
    await tx.address.delete({ where: { id } });
    if (existing.isDefault) {
      const next = await tx.address.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { id: true } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
}

export async function setDefaultAddress(userId: string, id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.address.findFirst({ where: { id, userId }, select: { id: true } });
    if (!existing) return;
    await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    await tx.address.update({ where: { id }, data: { isDefault: true } });
  });
}
