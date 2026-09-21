import { cookies } from "next/headers";
import { cache } from "react";
import { hasDatabase } from "@/lib/env";
import { prismaAuthRepo } from "./repo.prisma";
import { createAuthService, type SessionUser } from "./service";

export const authService = createAuthService(prismaAuthRepo);

// O prefixo __Host- obriga Secure + Path=/ e impede que outro subdomínio sobrescreva o cookie. Só funciona em HTTPS.
const isProd = process.env.NODE_ENV === "production";
const COOKIE = isProd ? "__Host-ls_session" : "ls_session";

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE)?.value;
}

/** Usuário logado (ou null). Cacheado por requisição. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  // Ler o cookie ANTES de qualquer outra checagem: é isso que marca a página como dinâmica (nunca pré-gerada no build).
  const token = await getSessionToken();
  if (!hasDatabase || !token) return null;
  try {
    return await authService.getSessionUser(token);
  } catch (error) {
    console.error("[auth] falha ao ler a sessão", error);
    return null;
  }
});

/** Cria uma sessão NOVA (troca o token a cada login) e grava o cookie. Só em Server Action ou Route Handler. */
export async function openSession(userId: string): Promise<void> {
  await closeSession();
  const { token, expiresAt } = await authService.startSession(userId);
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", expires: expiresAt });
}

export async function closeSession(): Promise<void> {
  const token = await getSessionToken();
  if (token) await authService.endSession(token).catch((error) => console.error("[auth] falha ao encerrar sessão", error));
  (await cookies()).delete(COOKIE);
}
