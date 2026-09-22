import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/server/audit/log";
import { sendOrderDeliveredEmail, sendOrderShippedEmail } from "@/server/orders/notifications";

export interface OrderFilters {
  status?: string;
  q?: string;
  page: number;
}

const PAGE_SIZE = 20;

export async function listAdminOrders(filters: OrderFilters) {
  const where: Prisma.OrderWhereInput = {
    ...(filters.status ? { status: filters.status as never } : {}),
    ...(filters.q ? { OR: [{ user: { name: { contains: filters.q, mode: "insensitive" } } }, { user: { email: { contains: filters.q, mode: "insensitive" } } }] } : {}),
  };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (filters.page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { user: { select: { name: true, email: true } }, _count: { select: { items: true } } } }),
    prisma.order.count({ where }),
  ]);
  return { orders, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export const getAdminOrder = (id: string) =>
  prisma.order.findUnique({ where: { id }, include: { user: true, items: true, shipment: true, payments: { orderBy: { createdAt: "desc" } }, coupon: { select: { code: true } } } });

export type AdminOrderStatus = "EM_SEPARACAO" | "ENVIADO" | "ENTREGUE" | "CANCELADO";

/**
 * Muda o status manualmente. ENVIADO e ENTREGUE disparam o e-mail correspondente (já prontos desde
 * a Etapa 8). Cancelar por aqui usa o mesmo caminho de sempre (devolve estoque), então nunca duplica
 * lógica com o cancelamento automático do checkout.
 */
export async function changeOrderStatus(adminId: string, orderId: string, status: AdminOrderStatus, trackingCode: string | null, carrier: string | null): Promise<{ ok: boolean; message?: string }> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order) return { ok: false, message: "Pedido não encontrado." };

  if (status === "CANCELADO") {
    const { cancelAndRestoreStock } = await import("@/server/checkout");
    await cancelAndRestoreStock(orderId, "Cancelado manualmente pelo administrador.");
    await logAdminAction(adminId, "CANCEL_ORDER", "Order", orderId, { status: order.status }, { status: "CANCELADO" });
    return { ok: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status } });
    if (status === "ENVIADO" && (trackingCode || carrier)) {
      await tx.shipment.updateMany({ where: { orderId }, data: { ...(trackingCode ? { trackingCode } : {}), ...(carrier ? { carrier } : {}), status: "SHIPPED" } });
    }
    if (status === "ENTREGUE") await tx.shipment.updateMany({ where: { orderId }, data: { status: "DELIVERED" } });
  });
  await logAdminAction(adminId, "CHANGE_STATUS", "Order", orderId, { status: order.status }, { status });

  if (status === "ENVIADO") await sendOrderShippedEmail(orderId, trackingCode, carrier);
  if (status === "ENTREGUE") await sendOrderDeliveredEmail(orderId);
  return { ok: true };
}

export async function confirmCashPayment(adminId: string, orderId: string): Promise<void> {
  const before = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!before || before.status !== "AGUARDANDO_PAGAMENTO_NA_ENTREGA") return;
  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: "PAGO", paidAt: new Date() } }),
    prisma.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "PAID", paidAt: new Date() } }),
  ]);
  await logAdminAction(adminId, "CONFIRM_CASH_PAYMENT", "Order", orderId, before, { status: "PAGO" });
}
