import { createMercadoPagoProvider } from "./mercadopago";
import type { PaymentProvider } from "./provider";

export * from "./provider";

let cached: PaymentProvider | undefined;

/** Único ponto de escolha do gateway. Trocar de provedor no futuro é adicionar outro "case" aqui. */
export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER || "mercadopago";
  if (name !== "mercadopago") throw new Error(`Gateway de pagamento "${name}" ainda não implementado.`);
  return (cached ??= createMercadoPagoProvider());
}
