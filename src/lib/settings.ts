import { cache } from "react";
import { hasDatabase } from "./env";
import { prisma } from "./prisma";
import { DEFAULT_SETTINGS, type StoreSettings } from "./settings-defaults";
import type { InstallmentRules } from "./money";

export { DEFAULT_SETTINGS, type StoreSettings };

/** Lê as configurações do banco, com fallback para os padrões. Nunca derruba a página. */
export const getSettings = cache(async (): Promise<StoreSettings> => {
  if (!hasDatabase) return DEFAULT_SETTINGS;
  try {
    const rows = await prisma.setting.findMany();
    const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      if (!(row.key in DEFAULT_SETTINGS)) continue;
      const def = (DEFAULT_SETTINGS as unknown as Record<string, unknown>)[row.key];
      // só aceita valor do mesmo tipo do padrão (null aceita string)
      if (def === null ? typeof row.value === "string" : typeof row.value === typeof def) merged[row.key] = row.value;
    }
    return merged as unknown as StoreSettings;
  } catch (error) {
    console.error("[settings] falha ao ler configurações, usando padrões", error);
    return DEFAULT_SETTINGS;
  }
});

export const installmentRules = (s: StoreSettings): InstallmentRules => ({
  interestFreeMax: s.installmentsInterestFreeMax,
  minInstallmentCents: s.minInstallmentCents,
  monthlyRate: s.monthlyInterestRate,
});
