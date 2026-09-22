"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/form-state";
import { fieldErrorsOf, formDataToObject } from "@/lib/validators/auth";
import { bannerSchema } from "@/lib/validators/admin";
import { requireAdmin } from "@/server/auth/guards";
import { createBanner, deleteBanner, updateBanner } from "@/server/admin/banners";

export async function saveBannerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const raw = formDataToObject(formData);
  const parsed = bannerSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    if (raw.id) await updateBanner(admin.id, raw.id, parsed.data);
    else await createBanner(admin.id, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível salvar o banner." };
  }
  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirect("/admin/banners");
}

export async function deleteBannerAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await deleteBanner(admin.id, id);
  revalidatePath("/admin/banners");
  revalidatePath("/");
}
