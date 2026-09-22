import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/server/checkout";

/**
 * Cancela pedidos de Pix cujo prazo venceu sem pagamento e devolve o estoque. Chamar a cada 10-15
 * minutos. O plano gratuito da Vercel só permite cron diário — use um serviço externo (ex.:
 * cron-job.org) apontando para esta URL com o cabeçalho Authorization, ou rode manualmente.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const received = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const ok = Boolean(secret) && received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const released = await releaseExpiredReservations();
  return NextResponse.json({ released });
}
