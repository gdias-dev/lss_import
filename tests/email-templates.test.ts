import { describe, expect, it } from "vitest";
import { escapeHtml, passwordChangedMessage, renderEmail, resetPasswordMessage, verifyEmailMessage } from "@/server/emails/templates";

describe("e-mails", () => {
  it("escapa HTML em qualquer texto vindo do usuário", () => {
    expect(escapeHtml(`<script>alert("x")</script> & '`)).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;");
    const { html } = verifyEmailMessage({ name: "<img src=x onerror=alert(1)> Maria" }, "tok");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("verificação e redefinição levam o link com o token codificado", () => {
    const v = verifyEmailMessage({ name: "Maria Silva" }, "abc-_123");
    expect(v.subject).toMatch(/Confirme seu e-mail/);
    expect(v.text).toContain("/verificar-email?token=abc-_123");
    expect(v.text).toContain("Olá, Maria!");

    const r = resetPasswordMessage({ name: "Maria" }, "a/b+c");
    expect(r.text).toContain("/redefinir-senha?token=a%2Fb%2Bc");
    expect(r.html).toContain("1 hora");
  });

  it("aviso de senha alterada e e-mail sem botão", () => {
    expect(passwordChangedMessage({ name: "Maria" }).subject).toBe("Sua senha foi alterada");
    expect(renderEmail({ title: "Oi", paragraphs: ["a"] }).html).not.toContain("<a href");
  });
});
