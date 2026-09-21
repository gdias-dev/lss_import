import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { safeNextPath } from "@/lib/safe-redirect";
import { addressSchema, changePasswordSchema, fieldErrorsOf, loginSchema, registerSchema } from "@/lib/validators/auth";

describe("telefone", () => {
  it("normaliza celular e fixo, com ou sem +55", () => {
    expect(normalizePhone("(21) 99999-0000")).toBe("21999990000");
    expect(normalizePhone("+55 21 99999-0000")).toBe("21999990000");
    expect(normalizePhone("21 2222-3333")).toBe("2122223333");
    expect(formatPhone("21999990000")).toBe("(21) 99999-0000");
  });
  it("rejeita números inválidos", () => {
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("(21) 89999-0000")).toBeNull(); // celular precisa começar com 9
    expect(normalizePhone("(05) 99999-0000")).toBeNull(); // DDD inexistente
  });
});

describe("safeNextPath", () => {
  it("aceita só caminhos internos", () => {
    expect(safeNextPath("/perfumes?genero=feminino")).toBe("/perfumes?genero=feminino");
    expect(safeNextPath("/conta/enderecos")).toBe("/conta/enderecos");
  });
  it("bloqueia redirecionamento para fora e laços de login", () => {
    for (const bad of ["//evil.com", "https://evil.com", "javascript:alert(1)", "/\\evil.com", "evil.com", "/ com espaço", "/entrar?next=/x", "/cadastrar"]) {
      expect(safeNextPath(bad)).toBe("/conta");
    }
    expect(safeNextPath(undefined)).toBe("/conta");
    expect(safeNextPath(null, "/")).toBe("/");
    expect(safeNextPath("//evil.com", "")).toBe("");
  });
});

describe("cadastro e login", () => {
  const valid = { name: "  Maria Silva ", email: " Maria@Exemplo.COM ", phone: "(21) 99999-0000", password: "Perfume@2026", acceptTerms: "on" };

  it("normaliza os dados", () => {
    const r = registerSchema.parse(valid);
    expect(r).toMatchObject({ name: "Maria Silva", email: "maria@exemplo.com", phone: "21999990000", password: "Perfume@2026" });
  });

  it("aponta cada erro no campo certo, em português", () => {
    const r = registerSchema.safeParse({ name: "M", email: "nao-e-email", phone: "123", password: "12345678", acceptTerms: undefined });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = fieldErrorsOf(r.error);
      expect(e.name?.[0]).toBe("Informe seu nome");
      expect(e.email?.[0]).toBe("E-mail inválido");
      expect(e.phone?.[0]).toMatch(/Telefone inválido/);
      expect(e.password?.[0]).toMatch(/muito comum/);
      expect(e.acceptTerms?.[0]).toMatch(/Aceite os termos/);
    }
  });

  it("exige tamanho mínimo e máximo de senha", () => {
    expect(registerSchema.safeParse({ ...valid, password: "curta" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: "a".repeat(129) }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ current: "x", password: "senha1234" }).success).toBe(false);
  });

  it("login exige e-mail e senha", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
    expect(loginSchema.parse({ email: " A@B.com ", password: "x" }).email).toBe("a@b.com");
  });
});

describe("endereço", () => {
  const base = { label: " Casa ", recipient: "Maria Silva", cep: "20040-020", street: "Rua A", number: "10", complement: "", neighborhood: "Centro", city: "Rio de Janeiro", state: "rj", isDefault: "on" };

  it("normaliza CEP, estado e opcionais", () => {
    expect(addressSchema.parse(base)).toMatchObject({ label: "Casa", cep: "20040020", state: "RJ", complement: undefined, isDefault: true });
    expect(addressSchema.parse({ ...base, isDefault: undefined }).isDefault).toBe(false);
  });

  it("rejeita CEP e estado inválidos", () => {
    const r = addressSchema.safeParse({ ...base, cep: "123", state: "XX" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = fieldErrorsOf(r.error);
      expect(e.cep?.[0]).toBe("CEP inválido");
      expect(e.state?.[0]).toBe("Selecione o estado");
    }
  });
});
