import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildCardRequestBody, buildPixRequestBody, mapStatus, verifyMercadoPagoSignature } from "@/server/payments/mercadopago";
import type { CreateCardInput, CreatePixInput } from "@/server/payments/provider";

const payer = { email: "maria@exemplo.com", firstName: "Maria", lastName: "Silva", cpf: "52998224725" };

describe("montagem da requisição do Mercado Pago", () => {
  it("Pix: envia valor em reais (não em centavos), CPF e data de expiração no futuro", () => {
    const input: CreatePixInput = { idempotencyKey: "k1", amountCents: 12990, description: "Pedido LS-000001", payer, externalReference: "order_1", expirationMinutes: 30 };
    const body = buildPixRequestBody(input, "https://loja.com/api/webhooks/mercadopago");
    expect(body.transaction_amount).toBe(129.9);
    expect(body.payment_method_id).toBe("pix");
    expect(body.payer.identification).toEqual({ type: "CPF", number: "52998224725" });
    expect(body.notification_url).toBe("https://loja.com/api/webhooks/mercadopago");
    expect(new Date(body.date_of_expiration!).getTime()).toBeGreaterThan(Date.now());
    expect(body).not.toHaveProperty("token");
  });

  it("cartão: inclui token, parcelas e emissor, sem dado de cartão em si", () => {
    const input: CreateCardInput = { idempotencyKey: "k2", amountCents: 28990, description: "Pedido LS-000002", payer, externalReference: "order_2", token: "card_tok_abc", installments: 3, paymentMethodId: "visa", issuerId: "310" };
    const body = buildCardRequestBody(input);
    expect(body).toMatchObject({ transaction_amount: 289.9, payment_method_id: "visa", token: "card_tok_abc", installments: 3, issuer_id: "310" });
    expect(JSON.stringify(body)).not.toMatch(/\d{4}\s?\d{4}\s?\d{4}\s?\d{4}/); // nenhum número de cartão no corpo
  });

  it("sem issuer_id, o campo não é enviado (a MP acusa erro se vier vazio)", () => {
    const input: CreateCardInput = { idempotencyKey: "k3", amountCents: 1000, description: "x", payer, externalReference: "o", token: "t", installments: 1, paymentMethodId: "master", issuerId: null };
    expect(buildCardRequestBody(input)).not.toHaveProperty("issuer_id");
  });
});

describe("status", () => {
  it("mapeia os status conhecidos e trata desconhecido como pendente", () => {
    expect(mapStatus("approved")).toBe("APPROVED");
    expect(mapStatus("rejected")).toBe("REJECTED");
    expect(mapStatus("cancelled")).toBe("CANCELED");
    expect(mapStatus("refunded")).toBe("REFUNDED");
    expect(mapStatus("in_process")).toBe("PENDING");
    expect(mapStatus("algo_novo_que_a_mp_lancar")).toBe("PENDING");
  });
});

describe("assinatura do webhook", () => {
  const secret = "segredo-do-app";
  const sign = (dataId: string, ts: string, requestId: string | null) => {
    const template = `id:${dataId};${requestId ? `request-id:${requestId};` : ""}ts:${ts};`;
    return createHmac("sha256", secret).update(template).digest("hex");
  };

  it("aceita uma assinatura válida", () => {
    const ts = "1700000000000";
    const requestId = "req-123";
    const v1 = sign("999999999", ts, requestId);
    expect(verifyMercadoPagoSignature({ signatureHeader: `ts=${ts},v1=${v1}`, requestId, dataId: "999999999", secret })).toBe(true);
  });

  it("rejeita assinatura errada, id trocado, header ausente ou secret vazio", () => {
    const ts = "1700000000000";
    const v1 = sign("999999999", ts, "req-123");
    expect(verifyMercadoPagoSignature({ signatureHeader: `ts=${ts},v1=${v1}`, requestId: "req-123", dataId: "OUTRO_ID", secret })).toBe(false);
    expect(verifyMercadoPagoSignature({ signatureHeader: `ts=${ts},v1=deadbeef`, requestId: "req-123", dataId: "999999999", secret })).toBe(false);
    expect(verifyMercadoPagoSignature({ signatureHeader: null, requestId: "req-123", dataId: "999999999", secret })).toBe(false);
    expect(verifyMercadoPagoSignature({ signatureHeader: `ts=${ts},v1=${v1}`, requestId: "req-123", dataId: "999999999", secret: "" })).toBe(false);
    expect(verifyMercadoPagoSignature({ signatureHeader: "formato-invalido", requestId: null, dataId: "x", secret })).toBe(false);
  });

  it("funciona sem x-request-id (a MP nem sempre envia)", () => {
    const ts = "1700000000000";
    const v1 = sign("999999999", ts, null);
    expect(verifyMercadoPagoSignature({ signatureHeader: `ts=${ts},v1=${v1}`, requestId: null, dataId: "999999999", secret })).toBe(true);
  });
});
