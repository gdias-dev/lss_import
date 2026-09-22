import { describe, expect, it } from "vitest";
import { buildShippingOptions, correiosFallbackOptions, findShippingOption, matchDeliveryZone, type DeliveryZoneInput, type ShippingOption } from "@/lib/shipping";

const zone = (over: Partial<DeliveryZoneInput> = {}): DeliveryZoneInput => ({
  id: "z1", name: "Centro RJ", feeCents: 1000, freeAboveCents: null, neighborhoods: ["Centro"], allowsPayOnDelivery: true, estimatedDays: 2, ranges: [{ cepStart: "20000000", cepEnd: "20099999" }], ...over,
});

describe("correios (tabela de contingência)", () => {
  it("PAC é mais barato e mais lento que o SEDEX, e o peso pesa no preço", () => {
    const [pac, sedex] = correiosFallbackOptions("20040-020", 500);
    expect(pac!.costCents).toBeLessThan(sedex!.costCents);
    expect(pac!.etaDays).toBeGreaterThan(sedex!.etaDays);
    const [pacLeve] = correiosFallbackOptions("20040-020", 400);
    const [pacPesado] = correiosFallbackOptions("20040-020", 2500); // 3kg cobrados (arredonda para cima)
    expect(pacPesado!.costCents).toBeGreaterThan(pacLeve!.costCents);
  });

  it("regiões diferentes de CEP têm preços diferentes", () => {
    const [rj] = correiosFallbackOptions("20000-000", 500);
    const [rs] = correiosFallbackOptions("90000-000", 500);
    expect(rj!.costCents).not.toBe(rs!.costCents);
  });
});

describe("zona de entrega própria", () => {
  it("bate por faixa de CEP", () => {
    expect(matchDeliveryZone([zone()], "20050-000", "Outro bairro")?.id).toBe("z1");
    expect(matchDeliveryZone([zone()], "21000-000", "Outro bairro")).toBeNull();
  });

  it("bate por nome de bairro, ignorando espaços e caixa", () => {
    expect(matchDeliveryZone([zone({ ranges: [] })], "99999-999", "  centro  ")?.id).toBe("z1");
    expect(matchDeliveryZone([zone({ ranges: [] })], "99999-999", "CENTRO")?.id).toBe("z1");
    expect(matchDeliveryZone([zone({ ranges: [] })], "99999-999", "Copacabana")).toBeNull();
  });
});

describe("montagem das opções", () => {
  const base = { cep: "20040-020", neighborhood: "Centro", weightGrams: 500, zones: [zone()], pickupEnabled: false, subtotalCentsForFreeShipping: 10000, globalFreeShipping: false };

  it("usa a cotação real do Melhor Envio quando disponível, em vez da tabela de contingência", () => {
    const live: ShippingOption[] = [{ key: "correios-me-1", method: "CORREIOS", service: "Correios PAC", label: "Correios PAC (até 5 dias úteis)", costCents: 1990, etaDays: 5, allowsPayOnDelivery: false, zoneId: null }];
    const options = buildShippingOptions({ ...base, liveCorreiosOptions: live });
    expect(options.filter((o) => o.method === "CORREIOS")).toEqual(live);
  });

  it("cai para a tabela de contingência quando a cotação real vier vazia", () => {
    const options = buildShippingOptions({ ...base, liveCorreiosOptions: [] });
    expect(options.some((o) => o.key.startsWith("correios-fallback-"))).toBe(true);
  });

  it("inclui Correios e a zona local quando bate", () => {
    const options = buildShippingOptions(base);
    expect(options.map((o) => o.method)).toEqual(["CORREIOS", "CORREIOS", "LOCAL_DELIVERY"]);
    expect(findShippingOption(options, "local-z1")?.costCents).toBe(1000);
  });

  it("retirada só aparece se estiver habilitada", () => {
    expect(buildShippingOptions(base).some((o) => o.method === "PICKUP")).toBe(false);
    expect(buildShippingOptions({ ...base, pickupEnabled: true }).find((o) => o.method === "PICKUP")).toMatchObject({ costCents: 0 });
  });

  it("frete grátis da zona (valor mínimo) zera só aquela opção", () => {
    const withThreshold = { ...base, zones: [zone({ freeAboveCents: 5000 })], subtotalCentsForFreeShipping: 6000 };
    expect(findShippingOption(buildShippingOptions(withThreshold), "local-z1")?.costCents).toBe(0);
  });

  it("frete grátis geral (cupom ou valor mínimo da loja) zera TODAS as opções com custo", () => {
    const options = buildShippingOptions({ ...base, globalFreeShipping: true });
    expect(options.every((o) => o.costCents === 0)).toBe(true);
    expect(options[0]!.label).toMatch(/grátis/);
  });
});
