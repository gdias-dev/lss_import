"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import type { FormState } from "@/lib/form-state";
import { hasDatabase } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-redirect";
import { fieldErrorsOf, forgotPasswordSchema, formDataToObject, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validators/auth";
import { closeSession, authService, getCurrentUser, openSession } from "@/server/auth/session";
import { hashToken } from "@/server/auth/tokens";
import { passwordChangedMessage, resetPasswordMessage, verifyEmailMessage } from "@/server/emails/templates";
import { sendEmailSafely } from "@/server/emails/send";
import { checkRateLimits, emailKey, getClientKey, rateLimitMessage } from "@/server/rate-limit";

const UNAVAILABLE = "Este recurso está indisponível no momento. Tente novamente mais tarde.";

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const values = { name: raw.name ?? "", email: raw.email ?? "", phone: raw.phone ?? "", next: raw.next ?? "" };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  if (!hasDatabase) return { error: UNAVAILABLE, values };

  const limit = await checkRateLimits([{ key: `register:ip:${await getClientKey()}`, limit: 10, windowSeconds: 3600 }]);
  if (!limit.ok) return { error: rateLimitMessage(limit.retryAfterSeconds), values };

  const result = await authService.register(parsed.data);
  if (!result.ok) return { fieldErrors: { email: ["Já existe uma conta com este e-mail. Entre ou recupere a senha."] }, values };

  after(() => sendEmailSafely({ to: result.user.email, ...verifyEmailMessage(result.user, result.verifyToken), idempotencyKey: `verify/${hashToken(result.verifyToken).slice(0, 24)}` }));
  await openSession(result.user.id);
  redirect(safeNextPath(raw.next, "/conta?boas-vindas=1"));
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const values = { email: raw.email ?? "", next: raw.next ?? "" };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  if (!hasDatabase) return { error: UNAVAILABLE, values };

  const ip = await getClientKey();
  const limit = await checkRateLimits([
    { key: `login:ip:${ip}`, limit: 30, windowSeconds: 600 },
    { key: `login:conta:${ip}:${emailKey(parsed.data.email)}`, limit: 8, windowSeconds: 600 },
  ]);
  if (!limit.ok) return { error: rateLimitMessage(limit.retryAfterSeconds), values };

  const user = await authService.login(parsed.data.email, parsed.data.password);
  if (!user) return { error: "E-mail ou senha incorretos.", values };

  await openSession(user.id);
  redirect(safeNextPath(raw.next));
}

export async function logoutAction(): Promise<void> {
  await closeSession();
  redirect("/");
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const values = { email: raw.email ?? "" };
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };
  if (!hasDatabase) return { error: UNAVAILABLE, values };

  const limit = await checkRateLimits([
    { key: `reset:ip:${await getClientKey()}`, limit: 5, windowSeconds: 3600 },
    { key: `reset:email:${emailKey(parsed.data.email)}`, limit: 3, windowSeconds: 3600 },
  ]);
  if (!limit.ok) return { error: rateLimitMessage(limit.retryAfterSeconds), values };

  const request = await authService.requestPasswordReset(parsed.data.email);
  if (request) {
    after(() => sendEmailSafely({ to: request.user.email, ...resetPasswordMessage(request.user, request.token), idempotencyKey: `reset/${hashToken(request.token).slice(0, 24)}` }));
  }
  // Resposta igual exista a conta ou não (não revela quem tem cadastro).
  return { ok: true, message: "Se existir uma conta com este e-mail, enviamos um link para criar uma nova senha. Ele vale por 1 hora." };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  if (!hasDatabase) return { error: UNAVAILABLE };

  const limit = await checkRateLimits([{ key: `reset-confirm:ip:${await getClientKey()}`, limit: 10, windowSeconds: 3600 }]);
  if (!limit.ok) return { error: rateLimitMessage(limit.retryAfterSeconds) };

  const result = await authService.resetPassword(parsed.data.token, parsed.data.password);
  if (!result.ok) return { error: "Este link é inválido ou expirou. Peça um novo link de recuperação." };

  const user = result.user;
  if (user) after(() => sendEmailSafely({ to: user.email, ...passwordChangedMessage(user) }));
  redirect("/entrar?redefinida=1");
}

export async function verifyEmailAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  if (token.length < 20 || token.length > 200) return { error: "Link inválido." };
  if (!hasDatabase) return { error: UNAVAILABLE };

  const limit = await checkRateLimits([{ key: `verify:ip:${await getClientKey()}`, limit: 15, windowSeconds: 3600 }]);
  if (!limit.ok) return { error: rateLimitMessage(limit.retryAfterSeconds) };

  const result = await authService.verifyEmail(token);
  if (!result.ok) return { error: "Este link é inválido ou expirou. Entre na sua conta e peça um novo e-mail de confirmação." };
  redirect((await getCurrentUser()) ? "/conta?verificado=1" : "/entrar?verificado=1");
}
