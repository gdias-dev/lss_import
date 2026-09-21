import { afterEach, describe, expect, it, vi } from "vitest";
import { formatCpf, isValidCpf } from "@/lib/cpf";
import { cepInRange, formatCep, isValidCep, lookupCep, normalizeCep } from "@/lib/cep";

describe("cpf", () => {
  it("valida dígitos verificadores", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("529.982.247-26")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });
  it("formata", () => {
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
  });
});

describe("cep", () => {
  it("normaliza, valida e formata", () => {
    expect(normalizeCep("20.040-020")).toBe("20040020");
    expect(isValidCep("20040-020")).toBe(true);
    expect(isValidCep("2004")).toBe(false);
    expect(formatCep("20040020")).toBe("20040-020");
  });
  it("confere faixa de CEP", () => {
    expect(cepInRange("20040-020", "20000000", "20999999")).toBe(true);
    expect(cepInRange("21000-000", "20000000", "20999999")).toBe(false);
    expect(cepInRange("abc", "20000000", "20999999")).toBe(false);
  });
});

describe("lookupCep", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("usa BrasilAPI quando o ViaCEP não encontra", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ erro: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ cep: "20040020", street: "Rua A", neighborhood: "Centro", city: "Rio de Janeiro", state: "RJ" }) });
    vi.stubGlobal("fetch", fetchMock);
    const r = await lookupCep("20040-020");
    expect(r).toEqual({ cep: "20040020", street: "Rua A", neighborhood: "Centro", city: "Rio de Janeiro", state: "RJ" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retorna null para CEP inválido sem chamar a rede", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await lookupCep("123")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
