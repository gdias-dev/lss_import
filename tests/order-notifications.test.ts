import { describe, expect, it } from "vitest";
import { orderCanceledMessage, orderCardProcessingMessage, orderCashOnDeliveryMessage, orderDeliveredMessage, orderPixPendingMessage, orderShippedMessage, orderStatusLabel, paymentConfirmedMessage, adminNewOrderMessage, type OrderEmailData } from "@/server/emails/order-templates";
import { publicCancelReason } from "@/server/orders/notifications";

const data: OrderEmailData = {
  orderNumber: 42,
  customerName: "Maria Silva",
  items: [{ productName: "Élan Noir", variantLabel: "100 ml", quantity: 1, totalCents: 28990 }],
  totalCents: 28990,
  address: { street: "Rua A", number: "10", complement: null, neighborhood: "Centro", city: "Rio de Janeiro", state: "RJ", cep: "20040020" },
  orderUrl: "https://exemplo.com.br/conta/pedidos/abc",
};

describe("modelos de e-mail do pedido", () => {
  it("Pix pendente menciona o prazo quando informado", () => {
    const withDeadline = orderPixPendingMessage(data, new Date("2026-01-01T15:30:00-03:00"));
    expect(withDeadline.subject).toContain("LS-000042");
    expect(withDeadline.text).toMatch(/Pague com Pix até/);
    const withoutDeadline = orderPixPendingMessage(data, null);
    expect(withoutDeadline.text).toContain("Pague com Pix para confirmar");
  });

  it("pagamento na entrega e cartão em análise têm textos distintos do Pix", () => {
    expect(orderCashOnDeliveryMessage(data).text).toContain("pagamento na entrega");
    expect(orderCardProcessingMessage(data).text).toMatch(/operadora do cartão está analisando/);
  });

  it("pagamento confirmado e entregue", () => {
    expect(paymentConfirmedMessage(data).subject).toMatch(/Pagamento confirmado/);
    expect(orderDeliveredMessage(data).text).toMatch(/avaliação/);
  });

  it("enviado inclui o código de rastreio só quando existe", () => {
    const comRastreio = orderShippedMessage(data, "BR123456789BR", "Correios");
    expect(comRastreio.text).toContain("BR123456789BR");
    expect(comRastreio.text).toContain("Correios");
    const semRastreio = orderShippedMessage(data, null, null);
    expect(semRastreio.text).not.toContain("Código de rastreio");
  });

  it("cancelado usa o motivo amigável recebido, nunca o texto técnico", () => {
    const msg = orderCanceledMessage(data, "o pagamento não foi aprovado pela operadora do cartão.");
    expect(msg.text).toContain("o pagamento não foi aprovado pela operadora do cartão.");
    expect(msg.text).toContain("Nenhum valor foi cobrado");
  });

  it("aviso ao dono inclui o status atual e o valor", () => {
    const msg = adminNewOrderMessage({ ...data, statusLabel: "Pago", adminUrl: "https://exemplo.com.br/admin/pedidos/abc" });
    expect(msg.subject).toContain("289,90");
    expect(msg.text).toContain("Status: Pago");
    expect(msg.text).toContain("Maria Silva");
  });
});

describe("motivo público do cancelamento (nunca vaza erro técnico)", () => {
  it("reconhece estoque insuficiente", () => {
    expect(publicCancelReason("PIX", 'O produto "100 ml" não tem mais estoque suficiente.')).toMatch(/não tinha mais estoque/);
  });
  it("reconhece expiração do Pix", () => {
    expect(publicCancelReason("PIX", "Prazo de pagamento do Pix expirou.")).toMatch(/prazo de pagamento do Pix expirou/);
  });
  it("cartão recusado tem texto específico", () => {
    expect(publicCancelReason("CREDIT_CARD", "Mercado Pago respondeu 400: cc_rejected_insufficient_amount")).toMatch(/não foi aprovado pela operadora/);
  });
  it("nunca inclui o texto técnico original na saída", () => {
    const technical = "Erro interno XYZ-500 do gateway";
    expect(publicCancelReason("PIX", technical)).not.toContain(technical);
  });
});

describe("orderStatusLabel", () => {
  it("traduz status conhecido e devolve o próprio valor se desconhecido", () => {
    expect(orderStatusLabel("PAGO")).toBe("Pago");
    expect(orderStatusLabel("ALGO_NOVO")).toBe("ALGO_NOVO");
  });
});
