import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { generateToken, hashToken } from "@/server/auth/tokens";

describe("senha (scrypt)", () => {
  it("gera hash com formato e sal únicos e valida a senha certa", async () => {
    const a = await hashPassword("Perfume@2026");
    const b = await hashPassword("Perfume@2026");
    expect(a).toMatch(/^scrypt\$32768\$8\$3\$/);
    expect(a).not.toBe(b);
    expect(a).not.toContain("Perfume@2026");
    expect(await verifyPassword("Perfume@2026", a)).toBe(true);
    expect(await verifyPassword("perfume@2026", a)).toBe(false);
  });

  it("rejeita hashes malformados sem lançar erro", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "md5$abc")).toBe(false);
    expect(await verifyPassword("x", "scrypt$abc$8$3$c2FsdA==$aGFzaA==")).toBe(false);
    expect(await verifyPassword("x", "scrypt$1073741824$8$3$c2FsdA==$aGFzaA==")).toBe(false); // custo absurdo
  });
});

describe("tokens", () => {
  it("são longos, únicos e o hash é estável", () => {
    const t = generateToken();
    expect(t.length).toBeGreaterThanOrEqual(43);
    expect(generateToken()).not.toBe(t);
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).not.toContain(t);
  });
});
