import { describe, expect, it } from "vitest";
import { couponSchema, deliveryZoneSchema, settingsSchema } from "@/lib/validators/admin";

describe("deliveryZoneSchema", () => {
  it("interpreta faixas de CEP separadas por vírgula", () => {
    const z = deliveryZoneSchema.parse({ name: "Centro", feeCents: "10", cepRanges: "20000-000 a 20099-999, 20200000 a 20299999", neighborhoods: "Centro, Glória" });
    expect(z.cepRanges).toEqual([
      { cepStart: "20000000", cepEnd: "20099999" },
      { cepStart: "20200000", cepEnd: "20299999" },
    ]);
    expect(z.neighborhoods).toEqual(["Centro", "Glória"]);
  });

  it("uma faixa sem hífen vira início e fim iguais", () => {
    expect(deliveryZoneSchema.parse({ name: "Zona", feeCents: "10", cepRanges: "20040020" }).cepRanges).toEqual([{ cepStart: "20040020", cepEnd: "20040020" }]);
  });

  it("campos vazios viram listas vazias, nunca quebram", () => {
    const z = deliveryZoneSchema.parse({ name: "Zona", feeCents: "10", cepRanges: "", neighborhoods: "" });
    expect(z.cepRanges).toEqual([]);
    expect(z.neighborhoods).toEqual([]);
  });

  it("converte o valor de frete grátis de reais para centavos", () => {
    expect(deliveryZoneSchema.parse({ name: "Zona", feeCents: "10", freeAboveCents: "150,50" }).freeAboveCents).toBe(15050);
    expect(deliveryZoneSchema.parse({ name: "Zona", feeCents: "10" }).freeAboveCents).toBeNull();
  });
});

describe("couponSchema", () => {
  it("normaliza o código para maiúsculas e rejeita caracteres inválidos", () => {
    expect(couponSchema.parse({ code: " bemvindo10 ", type: "PERCENT", value: "10", minSubtotalCents: "0" }).code).toBe("BEMVINDO10");
    expect(couponSchema.safeParse({ code: "a b", type: "PERCENT", value: "10", minSubtotalCents: "0" }).success).toBe(false);
  });

  it("limite de usos vazio vira null (sem limite)", () => {
    const c = couponSchema.parse({ code: "PROMO", type: "PERCENT", value: "10", minSubtotalCents: "0", maxUses: "", perUserLimit: "3" });
    expect(c.maxUses).toBeNull();
    expect(c.perUserLimit).toBe(3);
  });
});

describe("settingsSchema", () => {
  it("checkbox ausente (desmarcado) vira false", () => {
    const s = settingsSchema.parse({ storeName: "LS Imports", installmentsInterestFreeMax: "3", minInstallmentCents: "3000", monthlyInterestRate: "0", pixDiscountPercent: "0", freeShippingAboveCents: "0", pixExpirationMinutes: "30", handlingDays: "2" });
    expect(s.debitEnabled).toBe(false);
    expect(s.pickupEnabled).toBe(false);
  });

  it("rejeita juros mensais acima de 20%", () => {
    expect(settingsSchema.safeParse({ storeName: "X", installmentsInterestFreeMax: "3", minInstallmentCents: "3000", monthlyInterestRate: "0.5", pixDiscountPercent: "0", freeShippingAboveCents: "0", pixExpirationMinutes: "30", handlingDays: "2" }).success).toBe(false);
  });
});
