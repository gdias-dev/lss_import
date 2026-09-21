import { describe, expect, it } from "vitest";
import { buildOrderWhatsAppMessage, buildWhatsAppLink, formatOrderNumber, type WhatsAppOrder } from "@/lib/whatsapp";

const base: WhatsAppOrder = {
  number: 123,
  customerName: "Maria Silva",
  items: [{ name: "Perfume Teste", variantLabel: "100 ml", quantity: 1, totalCents: 25990 }],
  subtotalCents: 25990,
  discountCents: 2000,
  shippingCents: 2500,
  totalCents: 26490,
  couponCode: "BEMVINDO",
  shippingLabel: "PAC",
  paymentLabel: "Pix",
  addressLine: "Rua A, 10, Centro, Rio de Janeiro/RJ, 20000-000",
  orderUrl: "https://exemplo.com.br/conta/pedidos/abc",
};

describe("whatsapp", () => {
  it("monta o link com texto codificado", () => {
    expect(buildWhatsAppLink("+55 (21) 99999-0000")).toBe("https://wa.me/5521999990000");
    expect(buildWhatsAppLink("5521999990000", "olá & tudo")).toBe("https://wa.me/5521999990000?text=ol%C3%A1%20%26%20tudo");
  });

  it("formata o número do pedido", () => {
    expect(formatOrderNumber(123)).toBe("LS-000123");
  });

  it("gera a mensagem completa", () => {
    const msg = buildOrderWhatsAppMessage(base);
    expect(msg).toContain("#LS-000123");
    expect(msg).toContain("Maria Silva");
    expect(msg).toContain("cupom BEMVINDO");
    expect(msg).toContain("*Pagamento:* Pix");
    expect(msg).toContain("https://exemplo.com.br/conta/pedidos/abc");
  });

  it("encurta a lista de itens quando passa do limite", () => {
    const items = Array.from({ length: 80 }, (_, i) => ({ name: `Perfume número ${i + 1} com nome longo`, variantLabel: "100 ml", quantity: 1, totalCents: 10000 }));
    const msg = buildOrderWhatsAppMessage({ ...base, items });
    expect(msg.length).toBeLessThanOrEqual(1800);
    expect(msg).toMatch(/e mais \d+ item/);
    expect(msg).toContain("*Total:*");
  });
});
