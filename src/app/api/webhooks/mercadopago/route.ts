import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reconcilePayment } from "@/server/checkout";
import { verifyMercadoPagoSignature } from "@/server/payments/mercadopago";

/**
 * O Mercado Pago manda o evento em query params (data.id, type) e no corpo, e assina no header
 * x-signature. Sempre respondemos 200 rápido (mesmo em erro interno) para a MP não ficar reenviando
 * em looping; a idempotência garante que reprocessar o mesmo evento não causa efeito duplo.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic");

  const rawBody = await request.text();
  let body: Record<string, unknown> = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    // corpo vazio ou inválido: ainda assim os query params costumam bastar
  }

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret) {
    const ok = verifyMercadoPagoSignature({ signatureHeader: request.headers.get("x-signature"), requestId: request.headers.get("x-request-id"), dataId: dataId ?? "", secret });
    if (!ok) {
      console.warn("[webhook mercadopago] assinatura inválida, ignorando notificação");
      return NextResponse.json({ ok: true }); // 200 para a MP não reenviar; nunca revela o motivo
    }
  } else if (process.env.NODE_ENV === "production") {
    console.warn("[webhook mercadopago] MP_WEBHOOK_SECRET não configurado — notificações não são validadas");
  }

  const eventId = String((body.id as string | number | undefined) ?? dataId ?? crypto.randomUUID());
  try {
    await prisma.webhookEvent.create({ data: { provider: "mercadopago", eventId, payload: (body ?? {}) as never } });
  } catch {
    return NextResponse.json({ ok: true }); // já processado (violação do índice único provider+eventId)
  }

  try {
    if ((type === "payment" || (body.type as string) === "payment") && dataId) {
      await reconcilePayment(dataId);
    }
    await prisma.webhookEvent.updateMany({ where: { provider: "mercadopago", eventId }, data: { processedAt: new Date() } });
  } catch (error) {
    console.error("[webhook mercadopago] falha ao processar", error);
  }
  return NextResponse.json({ ok: true });
}
