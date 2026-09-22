import { describe, expect, it } from "vitest";
import { buildAddToCartBody, buildQuoteRequestBody, cartLineToQuoteProduct, mapQuotesToShippingOptions, type MelhorEnvioQuote, type ShipmentParty } from "@/server/shipping/melhorenvio";

describe("montagem da cotação", () => {
  it("envia só dígitos nos CEPs", () => {
    const body = buildQuoteRequestBody("20.040-020", "90570-020", []);
    expect(body).toEqual({ from: { postal_code: "20040020" }, to: { postal_code: "90570020" }, products: [] });
  });

  it("converte a linha do carrinho para o formato de produto, respeitando os mínimos dos Correios", () => {
    const p = cartLineToQuoteProduct({ variantId: "v1", heightCm: 1, widthCm: 5, lengthCm: 10, weightGrams: 50, priceCents: 28990, quantity: 2 });
    expect(p).toMatchObject({ id: "v1", height: 2, width: 11, length: 16, weight: 0.1, insurance_value: 289.9, quantity: 2 });
  });

  it("não trunca dimensões e peso maiores que o mínimo", () => {
    const p = cartLineToQuoteProduct({ variantId: "v2", heightCm: 20, widthCm: 15, lengthCm: 25, weightGrams: 1200, priceCents: 10000, quantity: 1 });
    expect(p).toMatchObject({ height: 20, width: 15, length: 25, weight: 1.2 });
  });
});

describe("resposta da cotação", () => {
  const quote = (over: Partial<MelhorEnvioQuote> = {}): MelhorEnvioQuote => ({ id: 1, name: "PAC", price: "22.90", delivery_time: 6, company: { id: 1, name: "Correios" }, error: null, ...over });

  it("converte para ShippingOption, com o preço em centavos", () => {
    const [opt] = mapQuotesToShippingOptions([quote()]);
    expect(opt).toMatchObject({ key: "correios-me-1", method: "CORREIOS", service: "Correios PAC", costCents: 2290, etaDays: 6, allowsPayOnDelivery: false });
    expect(opt!.label).toContain("até 6 dias úteis");
  });

  it("descarta cotações com erro (transportadora indisponível para o trajeto)", () => {
    const options = mapQuotesToShippingOptions([quote({ id: 2, error: "Endereço de origem inválido" }), quote({ id: 3 })]);
    expect(options).toHaveLength(1);
    expect(options[0]!.key).toBe("correios-me-3");
  });

  it("lida com preço numérico ou em texto e sem prazo informado", () => {
    expect(mapQuotesToShippingOptions([quote({ price: 19.9 })])[0]!.costCents).toBe(1990);
    const [semPrazo] = mapQuotesToShippingOptions([quote({ delivery_time: null })]);
    expect(semPrazo!.etaDays).toBe(7);
    expect(semPrazo!.label).not.toContain("até");
  });
});

describe("montagem do carrinho de etiqueta (Etapa 9)", () => {
  const party = (over: Partial<ShipmentParty> = {}): ShipmentParty => ({ name: "Maria Silva", phone: "(21) 99999-0000", document: "529.982.247-25", address: "Rua A", number: "10", district: "Centro", city: "Rio de Janeiro", stateAbbr: "RJ", postalCode: "20040-020", ...over });

  it("separa CPF e CNPJ e limpa a formatação", () => {
    const body = buildAddToCartBody({ serviceId: 1, from: party(), to: party({ name: "LS Imports", document: "", companyDocument: "12.345.678/0001-90" }), products: [{ id: "v1", height: 2, width: 11, length: 16, weight: 0.5, insurance_value: 100, quantity: 1 }], orderNumber: "LS-000001" });
    expect(body.from).toMatchObject({ phone: "21999990000", document: "52998224725", postal_code: "20040020" });
    expect(body.to).toMatchObject({ company_document: "12345678000190" });
    expect(body.to).not.toHaveProperty("document", "");
    expect(body.volumes).toEqual([{ height: 2, width: 11, length: 16, weight: 0.5 }]);
    expect(body.options.insurance_value).toBe(100);
  });
});
