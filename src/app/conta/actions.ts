"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import type { FormState } from "@/lib/form-state";
import { addressSchema, changePasswordSchema, fieldErrorsOf, formDataToObject, profileSchema } from "@/lib/validators/auth";
import { deleteAddress, saveAddress, setDefaultAddress } from "@/server/addresses";
import { requireUser } from "@/server/auth/guards";
import { authService, getSessionToken } from "@/server/auth/session";
import { hashToken } from "@/server/auth/tokens";
import { sendEmailSafely } from "@/server/emails/send";
import { passwordChangedMessage, verifyEmailMessage } from "@/server/emails/templates";
import { checkRateLimits, rateLimitMessage } from "@/server/rate-limit";

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/conta/dados");
  const raw = formDataToObject(formData);
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values: { name: raw.name ?? "", phone: raw.phone ?? "" } };
  await authService.updateProfile(user.id, parsed.data);
  revalidatePath("/conta", "layout");
  return { ok: true, message: "Dados atualizados.", values: { name: parsed.data.name, phone: parsed.data.phone } };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/conta/dados");
  const parsed = changePasswordSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const limit = await checkRateLimits([{ key: `senha:user:${user.id}`, limit: 8, windowSeconds: 3600 }]);
  if (!limit.ok) return { error: rateLimitMessage(limit.retryAfterSeconds) };

  const result = await authService.changePassword(user.id, parsed.data.current, parsed.data.password, await getSessionToken());
  if (!result.ok) return { fieldErrors: { current: ["Senha atual incorreta."] } };
  after(() => sendEmailSafely({ to: user.email, ...passwordChangedMessage(user) }));
  return { ok: true, message: "Senha alterada. Os outros aparelhos foram desconectados." };
}

export async function resendVerificationAction(): Promise<FormState> {
  const user = await requireUser("/conta");
  const limit = await checkRateLimits([{ key: `verificar-envio:user:${user.id}`, limit: 3, windowSeconds: 3600 }]);
  if (!limit.ok) return { error: rateLimitMessage(limit.retryAfterSeconds) };

  const request = await authService.requestEmailVerification(user.id);
  if (!request) return { ok: true, message: "Seu e-mail já está confirmado." };
  after(() => sendEmailSafely({ to: request.user.email, ...verifyEmailMessage(request.user, request.token), idempotencyKey: `verify/${hashToken(request.token).slice(0, 24)}` }));
  return { ok: true, message: "Enviamos um novo e-mail de confirmação. Olhe também a caixa de spam." };
}

export async function saveAddressAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/conta/enderecos");
  const raw = formDataToObject(formData);
  const parsed = addressSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const id = raw.id || undefined;
  const result = await saveAddress(user.id, parsed.data, id);
  if (!result.ok) return { error: result.reason === "LIMIT" ? "Você atingiu o limite de 10 endereços. Exclua um para adicionar outro." : "Endereço não encontrado." };
  revalidatePath("/conta/enderecos");
  redirect("/conta/enderecos");
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const user = await requireUser("/conta/enderecos");
  const id = String(formData.get("id") ?? "");
  if (id) await deleteAddress(user.id, id);
  revalidatePath("/conta/enderecos");
}

export async function setDefaultAddressAction(formData: FormData): Promise<void> {
  const user = await requireUser("/conta/enderecos");
  const id = String(formData.get("id") ?? "");
  if (id) await setDefaultAddress(user.id, id);
  revalidatePath("/conta/enderecos");
}
