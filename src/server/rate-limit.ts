import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { hasDatabase } from "@/lib/env";
import { prisma } from "@/lib/prisma";

/** Janela fixa por chave, atômica no banco. As datas do Prisma são UTC sem fuso, por isso o AT TIME ZONE. */
export function buildRateLimitSql(key: string, resetAt: Date): Prisma.Sql {
  return Prisma.sql`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= (now() AT TIME ZONE 'UTC') THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= (now() AT TIME ZONE 'UTC') THEN ${resetAt} ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"`;
}

export interface Limit {
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface LimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

/** Conta uma tentativa em cada limite. Para no primeiro estourado. Se o banco falhar, NÃO bloqueia o cliente. */
export async function checkRateLimits(limits: Limit[]): Promise<LimitResult> {
  if (!hasDatabase) return { ok: true, retryAfterSeconds: 0 };
  for (const { key, limit, windowSeconds } of limits) {
    try {
      const resetAt = new Date(Date.now() + windowSeconds * 1000);
      const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>(buildRateLimitSql(key, resetAt));
      const row = rows[0];
      if (row && Number(row.count) > limit) {
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((new Date(row.resetAt).getTime() - Date.now()) / 1000)) };
      }
    } catch (error) {
      console.error("[rate-limit] falha ao consultar o limite", error);
    }
  }
  return { ok: true, retryAfterSeconds: 0 };
}

export const rateLimitMessage = (seconds: number) => `Muitas tentativas. Tente novamente em ${Math.ceil(seconds / 60)} min.`;

/** IP do cliente (a Vercel preenche x-forwarded-for). Só o hash entra na chave, para não guardar o IP cru. */
export async function getClientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export const emailKey = (email: string) => createHash("sha256").update(email).digest("hex").slice(0, 16);
