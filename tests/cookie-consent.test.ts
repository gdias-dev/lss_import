import { describe, expect, it } from "vitest";
import { shouldShowCookieNotice } from "@/lib/cookie-consent";

describe("shouldShowCookieNotice", () => {
  it("mostra quando nunca foi decidido (localStorage vazio)", () => {
    expect(shouldShowCookieNotice(null)).toBe(true);
  });
  it("some depois de aceito", () => {
    expect(shouldShowCookieNotice("aceito")).toBe(false);
  });
  it("qualquer outro valor salvo ainda mostra (não assume aceite por engano)", () => {
    expect(shouldShowCookieNotice("")).toBe(true);
    expect(shouldShowCookieNotice("recusado")).toBe(true);
  });
});
