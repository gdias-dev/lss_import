"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/form-state";
import { fieldErrorsOf, formDataToObject } from "@/lib/validators/auth";
import { couponSchema } from "@/lib/validators/admin";
import { requireAdmin } from "@/server/auth/guards";
import { createCoupon, toggleCoupon, updateCoupon } from "@/server/admin/coupons";

export async function saveCouponAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const raw = formDataToObject(formData);
  const parsed = couponSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  if (parsed.data.endsAt && parsed.data.startsAt && parsed.data.endsAt <= parsed.data.startsAt) return { error: "A data final precisa ser depois da inicial." };

  // O formulário mostra o valor em reais para desconto fixo; o banco guarda em centavos.
  const data = { ...parsed.data, value: parsed.data.type === "FIXED" ? Math.round(parsed.data.value * 100) : parsed.data.value };

  try {
    if (raw.id) await updateCoupon(admin.id, raw.id, data);
    else await createCoupon(admin.id, data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível salvar o cupom." };
  }
  revalidatePath("/admin/cupons");
  redirect("/admin/cupons");
}

export async function toggleCouponAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await toggleCoupon(admin.id, id);
  revalidatePath("/admin/cupons");
}
