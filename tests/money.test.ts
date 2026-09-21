import { describe, expect, it } from "vitest";
import { bestInterestFreeLabel, buildInstallments, formatBRL, percentOf, toCents } from "@/lib/money";

describe("money", () => {
  it("formata centavos em reais", () => {
    expect(formatBRL(12990)).toMatch(/129,90/);
  });

  it("converte texto para centavos", () => {
    expect(toCents("1.234,56")).toBe(123456);
    expect(toCents("12,5")).toBe(1250);
    expect(toCents("R$ 10")).toBe(1000);
    expect(toCents(19.9)).toBe(1990);
    expect(() => toCents("abc")).toThrow();
    expect(() => toCents("")).toThrow();
  });

  it("calcula desconto percentual sem passar do valor base", () => {
    expect(percentOf(10000, 10)).toBe(1000);
    expect(percentOf(10000, 150)).toBe(10000);
    expect(percentOf(10000, -5)).toBe(0);
  });

  it("parcela sem juros respeitando o máximo configurado", () => {
    const r = buildInstallments(30000, { interestFreeMax: 3, minInstallmentCents: 3000, monthlyRate: 0 });
    expect(r.map((p) => p.count)).toEqual([1, 2, 3]);
    expect(r[2]).toMatchObject({ installmentCents: 10000, totalCents: 30000, hasInterest: false });
  });

  it("aplica tabela Price acima do limite sem juros", () => {
    const r = buildInstallments(30000, { interestFreeMax: 3, minInstallmentCents: 3000, monthlyRate: 0.0299 });
    const six = r.find((p) => p.count === 6)!;
    expect(six.hasInterest).toBe(true);
    expect(six.installmentCents).toBeGreaterThan(5500);
    expect(six.installmentCents).toBeLessThan(5570);
    expect(six.totalCents).toBeGreaterThan(30000);
    expect(r.find((p) => p.count === 3)!.hasInterest).toBe(false);
  });

  it("respeita o valor mínimo da parcela", () => {
    const r = buildInstallments(6000, { interestFreeMax: 6, minInstallmentCents: 3000, monthlyRate: 0 });
    expect(r.map((p) => p.count)).toEqual([1, 2]);
  });

  it("gera o texto de vitrine só quando há parcelamento sem juros", () => {
    expect(bestInterestFreeLabel(30000, { interestFreeMax: 3, minInstallmentCents: 3000, monthlyRate: 0 })).toMatch(/^3x de .*100,00 sem juros$/);
    expect(bestInterestFreeLabel(30000, { interestFreeMax: 1, minInstallmentCents: 3000, monthlyRate: 0 })).toBeNull();
  });
});
