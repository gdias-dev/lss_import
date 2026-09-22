"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/form-state";
import { fieldErrorsOf, formDataToObject } from "@/lib/validators/auth";
import { settingsSchema } from "@/lib/validators/admin";
import { requireAdmin } from "@/server/auth/guards";
import { updateSettings } from "@/server/admin/settings";

export async function updateSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = settingsSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  await updateSettings(admin.id, parsed.data);
  revalidatePath("/", "layout"); // a barra de benefícios e o rodapé leem as configurações
  return { ok: true, message: "Configurações salvas." };
}
