"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/form-state";
import { MAX_QTY_PER_ITEM, normalizeCouponCode } from "@/lib/cart";
import { requireUser } from "@/server/auth/guards";
import { getCurrentUser } from "@/server/auth/session";
import { addToCart, applyCoupon, clearUnavailable, countCartUnits, removeCoupon, removeItem, setQuantity } from "@/server/cart";
import { checkRateLimits, rateLimitMessage } from "@/server/rate-limit";

export interface AddToCartResponse {
  ok: boolean;
  message: string;
  count?: number;
  needsLogin?: boolean;
}

/** Chamada direto pelo botão da página do produto. Sem login, devolve needsLogin para o botão levar ao /entrar. */
export async function addToCartAction(variantId: string, quantity: number): Promise<AddToCartResponse> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsLogin: true, message: "Entre na sua conta para adicionar ao carrinho." };

  const qty = Math.trunc(Number(quantity));
  if (typeof variantId !== "string" || !/^[a-z0-9]{10,40}$/i.test(variantId) || !Number.isFinite(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) {
    return { ok: false, message: "Não foi possível adicionar este produto." };
  }

  const limit = await checkRateLimits([{ key: `carrinho:user:${user.id}`, limit: 120, windowSeconds: 60 }]);
  if (!limit.ok) return { ok: false, message: rateLimitMessage(limit.retryAfterSeconds) };

  const result = await addToCart(user.id, variantId, qty);
  if (!result.ok) {
    const message = { UNAVAILABLE: "Este produto não está mais disponível.", OUT_OF_STOCK: "Este tamanho está esgotado.", CART_FULL: "Seu carrinho atingiu o limite de 30 produtos diferentes." }[result.reason];
    return { ok: false, message };
  }
  revalidatePath("/carrinho");
  return {
    ok: true,
    count: await countCartUnits(user.id),
    message: result.clamped ? "Este produto está no carrinho com a quantidade máxima disponível." : "Adicionado ao carrinho.",
  };
}

export async function updateQuantityAction(formData: FormData): Promise<void> {
  const user = await requireUser("/carrinho");
  const itemId = String(formData.get("itemId") ?? "");
  const quantity = Math.trunc(Number(formData.get("quantity")));
  if (itemId && Number.isFinite(quantity)) await setQuantity(user.id, itemId, quantity);
  revalidatePath("/carrinho");
}

export async function removeItemAction(formData: FormData): Promise<void> {
  const user = await requireUser("/carrinho");
  const itemId = String(formData.get("itemId") ?? "");
  if (itemId) await removeItem(user.id, itemId);
  revalidatePath("/carrinho");
}

export async function clearUnavailableAction(): Promise<void> {
  const user = await requireUser("/carrinho");
  await clearUnavailable(user.id);
  revalidatePath("/carrinho");
}

export async function applyCouponAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/carrinho");
  const code = normalizeCouponCode(String(formData.get("code") ?? ""));
  if (!code) return { error: "Digite um código de cupom válido." };

  // limite de tentativas: impede descobrir cupons por tentativa e erro
  const limit = await checkRateLimits([{ key: `cupom:user:${user.id}`, limit: 10, windowSeconds: 600 }]);
  if (!limit.ok) return { error: rateLimitMessage(limit.retryAfterSeconds) };

  const result = await applyCoupon(user.id, code);
  if (!result.ok) return { error: result.message };
  revalidatePath("/carrinho");
  return { ok: true, message: `Cupom ${result.code} aplicado.` };
}

export async function removeCouponAction(): Promise<void> {
  const user = await requireUser("/carrinho");
  await removeCoupon(user.id);
  revalidatePath("/carrinho");
}
