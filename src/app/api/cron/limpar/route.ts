import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Limpeza diária: sessões vencidas, tokens de e-mail usados ou vencidos, limites de tentativa antigos. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const received = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const ok = Boolean(secret) && received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3_600_000);
  const [sessions, tokens, limits] = await Promise.all([
    prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.emailToken.deleteMany({ where: { OR: [{ expiresAt: { lt: weekAgo } }, { usedAt: { lt: weekAgo } }] } }),
    prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }),
  ]);
  return NextResponse.json({ sessions: sessions.count, tokens: tokens.count, limits: limits.count });
}
