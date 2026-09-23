import { describe, expect, it } from "vitest";
import { isMelhorEnvioConfigured } from "@/server/admin/shipping-label";

describe("isMelhorEnvioConfigured", () => {
  const FULL = {
    MELHORENVIO_TOKEN: "tok",
    STORE_ORIGIN_CEP: "20040020",
    STORE_ORIGIN_STREET: "Rua A",
    STORE_ORIGIN_NUMBER: "10",
    STORE_ORIGIN_NEIGHBORHOOD: "Centro",
    STORE_ORIGIN_CITY: "Rio de Janeiro",
    STORE_ORIGIN_STATE: "RJ",
  };
  const KEYS = Object.keys(FULL) as (keyof typeof FULL)[];
  const originalValues = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

  const restore = () => KEYS.forEach((k) => (originalValues[k] === undefined ? delete process.env[k] : (process.env[k] = originalValues[k])));

  it("verdadeiro só quando TODOS os campos de origem e o token estão presentes", () => {
    KEYS.forEach((k) => (process.env[k] = FULL[k]));
    expect(isMelhorEnvioConfigured()).toBe(true);
    restore();
  });

  it("falta qualquer um dos campos já desativa a compra automática", () => {
    for (const missing of KEYS) {
      KEYS.forEach((k) => (process.env[k] = k === missing ? "" : FULL[k]));
      expect(isMelhorEnvioConfigured()).toBe(false);
    }
    restore();
  });
});
