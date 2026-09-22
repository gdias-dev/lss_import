/**
 * Interface comum de pagamento. Cada gateway (Mercado Pago, Asaas, Pagar.me...) implementa isso,
 * então o checkout nunca fala diretamente com a API de um gateway específico. Trocar de gateway
 * é trocar a implementação; o checkout continua igual.
 */
export type ProviderPaymentStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELED" | "REFUNDED";

export interface Payer {
  email: string;
  firstName: string;
  lastName: string;
  cpf: string; // só dígitos
}

export interface CreatePixInput {
  idempotencyKey: string;
  amountCents: number;
  description: string;
  payer: Payer;
  externalReference: string; // id do nosso pedido
  expirationMinutes: number;
}

export interface PixResult {
  providerPaymentId: string;
  status: ProviderPaymentStatus;
  statusDetail: string;
  qrCode: string | null; // "copia e cola"
  qrCodeBase64: string | null; // imagem do QR Code
  expiresAt: Date | null;
  raw: unknown;
}

export interface CreateCardInput {
  idempotencyKey: string;
  amountCents: number;
  description: string;
  payer: Payer;
  externalReference: string;
  token: string; // gerado no navegador pelo SDK do gateway; o servidor nunca vê o número do cartão
  installments: number;
  paymentMethodId: string; // "visa", "master"...
  issuerId: string | null;
}

export interface CardResult {
  providerPaymentId: string;
  status: ProviderPaymentStatus;
  statusDetail: string;
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  createPixPayment(input: CreatePixInput): Promise<PixResult>;
  createCardPayment(input: CreateCardInput): Promise<CardResult>;
  /** Consulta o status atual direto na API do gateway (nunca confiar só no payload do webhook). */
  getPaymentStatus(providerPaymentId: string): Promise<{ status: ProviderPaymentStatus; statusDetail: string; raw: unknown }>;
}

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
