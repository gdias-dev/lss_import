/**
 * Integração com o Mercado Pago (Checkout API, endpoint /v1/payments — https://api.mercadopago.com).
 * As funções "build*" só montam a requisição e são puras (testáveis sem rede). "call*" fazem a
 * chamada HTTP de verdade. Nunca testado contra credenciais reais: revisar em sandbox antes de produção.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { CardResult, CreateCardInput, CreatePixInput, PaymentProvider, PixResult, ProviderPaymentStatus } from "./provider";
import { PaymentProviderError } from "./provider";

const API_BASE = "https://api.mercadopago.com";

const centsToAmount = (cents: number) => Math.round(cents) / 100;

export function mapStatus(status: string): ProviderPaymentStatus {
  switch (status) {
    case "approved":
      return "APPROVED";
    case "rejected":
      return "REJECTED";
    case "cancelled":
      return "CANCELED";
    case "refunded":
    case "charged_back":
      return "REFUNDED";
    case "pending":
    case "in_process":
    case "in_mediation":
    default:
      return "PENDING";
  }
}

export interface MpPaymentRequestBody {
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  external_reference: string;
  payer: { email: string; first_name: string; last_name: string; identification: { type: "CPF"; number: string } };
  token?: string;
  installments?: number;
  issuer_id?: string;
  date_of_expiration?: string;
  notification_url?: string;
}

export function buildPixRequestBody(input: CreatePixInput, notificationUrl?: string): MpPaymentRequestBody {
  const expiresAt = new Date(Date.now() + input.expirationMinutes * 60_000);
  return {
    transaction_amount: centsToAmount(input.amountCents),
    description: input.description,
    payment_method_id: "pix",
    external_reference: input.externalReference,
    payer: { email: input.payer.email, first_name: input.payer.firstName, last_name: input.payer.lastName, identification: { type: "CPF", number: input.payer.cpf } },
    date_of_expiration: expiresAt.toISOString(),
    ...(notificationUrl ? { notification_url: notificationUrl } : {}),
  };
}

export function buildCardRequestBody(input: CreateCardInput, notificationUrl?: string): MpPaymentRequestBody {
  return {
    transaction_amount: centsToAmount(input.amountCents),
    description: input.description,
    payment_method_id: input.paymentMethodId,
    external_reference: input.externalReference,
    payer: { email: input.payer.email, first_name: input.payer.firstName, last_name: input.payer.lastName, identification: { type: "CPF", number: input.payer.cpf } },
    token: input.token,
    installments: input.installments,
    ...(input.issuerId ? { issuer_id: input.issuerId } : {}),
    ...(notificationUrl ? { notification_url: notificationUrl } : {}),
  };
}

/**
 * Valida a assinatura do webhook (header x-signature) conforme a documentação do Mercado Pago:
 * modelo "id:{data.id};request-id:{x-request-id};ts:{ts};" assinado em HMAC-SHA256 com o secret do app.
 * data.id é o valor cru da query string (o Mercado Pago pede para NÃO alterar maiúsculas/minúsculas).
 */
export function verifyMercadoPagoSignature(params: { signatureHeader: string | null; requestId: string | null; dataId: string; secret: string }): boolean {
  if (!params.signatureHeader || !params.secret) return false;
  const parts = Object.fromEntries(
    params.signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const template = `id:${params.dataId};${params.requestId ? `request-id:${params.requestId};` : ""}ts:${ts};`;
  const expected = createHmac("sha256", params.secret).update(template).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function callMercadoPago(path: string, init: RequestInit & { idempotencyKey?: string }): Promise<{ status: number; body: Record<string, unknown> }> {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new PaymentProviderError("MP_ACCESS_TOKEN não configurado");

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, body };
}

function extractPixData(body: Record<string, unknown>) {
  const poi = body.point_of_interaction as Record<string, unknown> | undefined;
  const td = poi?.transaction_data as Record<string, unknown> | undefined;
  return { qrCode: (td?.qr_code as string) ?? null, qrCodeBase64: (td?.qr_code_base64 as string) ?? null };
}

export function createMercadoPagoProvider(): PaymentProvider {
  const notificationUrl = process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/mercadopago` : undefined;

  return {
    name: "mercadopago",

    async createPixPayment(input): Promise<PixResult> {
      const body = buildPixRequestBody(input, notificationUrl);
      const { status, body: res } = await callMercadoPago("/v1/payments", { method: "POST", body: JSON.stringify(body), idempotencyKey: input.idempotencyKey });
      if (status >= 400) throw new PaymentProviderError(`Mercado Pago recusou a criação do Pix (${status}): ${JSON.stringify(res).slice(0, 300)}`, res);
      const pix = extractPixData(res);
      return {
        providerPaymentId: String(res.id ?? ""),
        status: mapStatus(String(res.status ?? "pending")),
        statusDetail: String(res.status_detail ?? ""),
        qrCode: pix.qrCode,
        qrCodeBase64: pix.qrCodeBase64,
        expiresAt: typeof res.date_of_expiration === "string" ? new Date(res.date_of_expiration) : null,
        raw: res,
      };
    },

    async createCardPayment(input): Promise<CardResult> {
      const body = buildCardRequestBody(input, notificationUrl);
      const { status, body: res } = await callMercadoPago("/v1/payments", { method: "POST", body: JSON.stringify(body), idempotencyKey: input.idempotencyKey });
      // 4xx aqui costuma ser cartão recusado, não um bug: devolvemos como REJECTED em vez de lançar erro.
      if (status >= 500) throw new PaymentProviderError(`Mercado Pago indisponível (${status})`, res);
      return { providerPaymentId: String(res.id ?? ""), status: mapStatus(String(res.status ?? "rejected")), statusDetail: String(res.status_detail ?? ""), raw: res };
    },

    async getPaymentStatus(providerPaymentId) {
      const { status, body: res } = await callMercadoPago(`/v1/payments/${encodeURIComponent(providerPaymentId)}`, { method: "GET" });
      if (status >= 400) throw new PaymentProviderError(`Não foi possível consultar o pagamento ${providerPaymentId} (${status})`, res);
      return { status: mapStatus(String(res.status ?? "pending")), statusDetail: String(res.status_detail ?? ""), raw: res };
    },
  };
}
