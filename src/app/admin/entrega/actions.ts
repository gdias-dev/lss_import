"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/form-state";
import { fieldErrorsOf, formDataToObject } from "@/lib/validators/auth";
import { deliveryZoneSchema } from "@/lib/validators/admin";
import { requireAdmin } from "@/server/auth/guards";
import { createDeliveryZone, toggleDeliveryZone, updateDeliveryZone } from "@/server/admin/delivery-zones";

export async function saveDeliveryZoneAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const raw = formDataToObject(formData);
  const parsed = deliveryZoneSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  if (parsed.data.cepRanges.length === 0 && parsed.data.neighborhoods.length === 0) return { error: "Informe pelo menos uma faixa de CEP ou um bairro." };

  try {
    if (raw.id) await updateDeliveryZone(admin.id, raw.id, parsed.data);
    else await createDeliveryZone(admin.id, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível salvar a zona." };
  }
  revalidatePath("/admin/entrega");
  redirect("/admin/entrega");
}

export async function toggleDeliveryZoneAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await toggleDeliveryZone(admin.id, id);
  revalidatePath("/admin/entrega");
}
