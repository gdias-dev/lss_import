/** Valores PROVISÓRIOS. O dono da loja ajusta tudo pelo painel (Etapa 9). */
export interface StoreSettings {
  storeName: string;
  installmentsInterestFreeMax: number;
  minInstallmentCents: number;
  monthlyInterestRate: number; // decimal: 0.0299 = 2,99% ao mês. 0 = não cobra juros
  pixDiscountPercent: number;
  freeShippingAboveCents: number; // 0 = desligado
  debitEnabled: boolean;
  pickupEnabled: boolean;
  pixExpirationMinutes: number;
  handlingDays: number;
  cnpj: string | null;
  instagramUrl: string;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "LS Imports",
  installmentsInterestFreeMax: 3,
  minInstallmentCents: 3000,
  monthlyInterestRate: 0,
  pixDiscountPercent: 0,
  freeShippingAboveCents: 0,
  debitEnabled: false,
  pickupEnabled: false,
  pixExpirationMinutes: 30,
  handlingDays: 2,
  cnpj: null,
  instagramUrl: "https://www.instagram.com/lss.import/",
};
