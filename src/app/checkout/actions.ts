"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/lib/form-state";
import { fieldErrorsOf, formDataToObject } from "@/lib/validators/auth";
import { placeOrderSchema } from "@/lib/validators/checkout";
import { requireUser } from "@/server/auth/guards";
import { CheckoutError, getShippingOptionsForAddress, placeOrder } from "@/server/checkout";
import { checkRateLimits, rateLimitMessage } from "@/server/rate-limit";

export interface ShippingOptionView {
  key: string;
  label: string;
  costCents: number;
  allowsPayOnDelivery: boolean;
}

/** Chamada pelo cliente sempre que ele troca o endereço selecionado no checkout. */
export async function getShippingOptionsAction(addressId: string): Promise<{ ok: true; options: ShippingOptionView[] } | { ok: false; message: string }> {
  const user = await requireUser("/checkout");
  if (typeof addressId !== "string" || addressId.length < 10 || addressId.length > 40) return { ok: false, message: "Endereço inválido." };

  const result = await getShippingOptionsForAddress(user.id, addressId);
  if (!result) return { ok: false, message: "Endereço não encontrado." };
  if (result.options.length === 0) return { ok: false, message: "Não encontramos opções de entrega para este endereço." };
  return { ok: true, options: result.options.map((o) => ({ key: o.key, label: o.label, costCents: o.costCents, allowsPayOnDelivery: o.allowsPayOnDelivery })) };
}

export interface PlaceOrderState extends FormState {
  cardDeclined?: boolean;
}

export async function placeOrderAction(_prev: PlaceOrderState, formData: FormData): Promise<PlaceOrderState> {
  const user = await requireUser("/checkout");
  const raw = formDataToObject(formData);
  const parsed = placeOrderSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const limit = await checkRateLimits([{ key: `checkout:user:${user.id}`, limit: 10, windowSeconds: 600 }]);
  if (!limit.ok) return { error: rateLimitMessage(limit.retryAfterSeconds) };

  let orderId: string;
  try {
    const result = await placeOrder(user.id, parsed.data);
    if (result.cardDeclined) return { error: "Pagamento recusado pela operadora do cartão. Tente novamente com outro cartão ou escolha outra forma de pagamento.", cardDeclined: true };
    orderId = result.orderId;
  } catch (error) {
    if (error instanceof CheckoutError) return { error: error.message };
    console.error("[checkout] falha ao criar o pedido", error);
    return { error: "Não foi possível concluir o pedido agora. Tente novamente em instantes." };
  }
  redirect(`/pedido/${orderId}/confirmado`);
}
