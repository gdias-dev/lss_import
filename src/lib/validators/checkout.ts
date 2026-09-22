import { z } from "zod";
import { isValidCpf } from "../cpf";
import { onlyDigits } from "../utils";

export const cpfField = z
  .string()
  .trim()
  .transform((v) => onlyDigits(v))
  .refine((v) => isValidCpf(v), "CPF inválido");

const paymentMethodSchema = z.enum(["PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH_ON_DELIVERY", "CARD_ON_DELIVERY"]);

/** O que o formulário de checkout envia. O servidor recalcula tudo; nada aqui é confiado como preço. */
export const placeOrderSchema = z
  .object({
    addressId: z.string().min(10).max(40),
    shippingKey: z.string().min(1).max(80),
    paymentMethod: paymentMethodSchema,
    cpf: z.string().optional(), // só obrigatório se o cliente ainda não tem CPF salvo (checado no servidor)
    customerNote: z.string().trim().max(300).optional(),
    // cartão
    cardToken: z.string().min(10).max(200).optional(),
    cardPaymentMethodId: z.string().min(2).max(40).optional(),
    cardIssuerId: z.string().max(20).optional(),
    installments: z.coerce.number().int().min(1).max(12).optional(),
    // pagamento na entrega em dinheiro
    changeForCents: z.coerce.number().int().min(0).max(100_000_000).optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.paymentMethod === "CREDIT_CARD" || data.paymentMethod === "DEBIT_CARD") && (!data.cardToken || !data.cardPaymentMethodId)) {
      ctx.addIssue({ code: "custom", path: ["cardToken"], message: "Dados do cartão incompletos." });
    }
  });

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
