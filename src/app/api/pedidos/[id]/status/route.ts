import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth/session";
import { reconcilePayment } from "@/server/checkout";
import { checkRateLimits, getClientKey } from "@/server/rate-limit";

/** Consultado pela tela de confirmação enquanto o Pix está pendente. Sempre confere com o gateway, nunca só o banco. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findFirst({ where: { id, userId: user.id }, select: { id: true, status: true, payments: { orderBy: { createdAt: "desc" }, take: 1, select: { providerPaymentId: true, status: true } } } });
  if (!order) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

  const payment = order.payments[0];
  if (order.status === "AGUARDANDO_PAGAMENTO" && payment?.providerPaymentId && payment.status === "PENDING") {
    const limit = await checkRateLimits([{ key: `status-pedido:ip:${await getClientKey()}`, limit: 30, windowSeconds: 60 }]);
    if (limit.ok) {
      try {
        await reconcilePayment(payment.providerPaymentId);
      } catch (error) {
        console.error("[checkout] falha ao conciliar pagamento no polling", error);
      }
    }
  }

  const fresh = await prisma.order.findUnique({ where: { id }, select: { status: true } });
  return NextResponse.json({ status: fresh?.status ?? order.status }, { headers: { "Cache-Control": "no-store" } });
}
