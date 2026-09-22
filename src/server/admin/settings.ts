import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS, type StoreSettings } from "@/lib/settings-defaults";
import { logAdminAction } from "@/server/audit/log";

export async function getAllSettings(): Promise<StoreSettings> {
  const rows = await prisma.setting.findMany();
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of rows) if (row.key in DEFAULT_SETTINGS) merged[row.key] = row.value;
  return merged as unknown as StoreSettings;
}

export async function updateSettings(adminId: string, patch: Partial<StoreSettings>): Promise<void> {
  const before = await getAllSettings();
  await prisma.$transaction(Object.entries(patch).map(([key, value]) => prisma.setting.upsert({ where: { key }, update: { value: value as never }, create: { key, value: value as never } })));
  await logAdminAction(adminId, "UPDATE_SETTINGS", "Setting", null, before, { ...before, ...patch });
}
