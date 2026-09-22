"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/form-state";
import { fieldErrorsOf, formDataToObject } from "@/lib/validators/auth";
import { orderStatusSchema } from "@/lib/validators/admin";
import { requireAdmin } from "@/server/auth/guards";
import { changeOrderStatus, confirmCashPayment } from "@/server/admin/orders";

export async function changeOrderStatusAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const parsed = orderStatusSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const result = await changeOrderStatus(admin.id, orderId, parsed.data.status, parsed.data.trackingCode, parsed.data.carrier);
  if (!result.ok) return { error: result.message ?? "Não foi possível mudar o status." };
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  return { ok: true, message: "Status atualizado." };
}

export async function confirmCashPaymentAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  if (orderId) await confirmCashPayment(admin.id, orderId);
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
}
