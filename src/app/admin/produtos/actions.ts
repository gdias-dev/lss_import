"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/form-state";
import { fieldErrorsOf, formDataToObject } from "@/lib/validators/auth";
import { brandSchema, productSchema, variantSchema } from "@/lib/validators/admin";
import { requireAdmin } from "@/server/auth/guards";
import {
  addProductImage,
  createProduct,
  createVariant,
  deleteProductImage,
  deleteVariant,
  ensureBrand,
  toggleProductActive,
  updateProduct,
  updateVariant,
} from "@/server/admin/products";
import { buildProductsCsv } from "@/server/admin/csv";
import { importProductsFromCsv } from "@/server/admin/csv-import";
import { prisma } from "@/lib/prisma";
import { checkRateLimits, rateLimitMessage } from "@/server/rate-limit";

export async function saveProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const raw = formDataToObject(formData);
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  let brandId = raw.brandId;
  if (raw.newBrandName?.trim()) {
    const brand = brandSchema.safeParse({ name: raw.newBrandName });
    if (!brand.success) return { fieldErrors: { newBrandName: ["Nome de marca inválido."] } };
    brandId = await ensureBrand(admin.id, brand.data.name);
  }
  if (!brandId) return { fieldErrors: { brandId: ["Escolha ou crie uma marca."] } };
  const data = { ...parsed.data, brandId };

  let id = raw.id;
  try {
    if (id) await updateProduct(admin.id, id, data);
    else id = await createProduct(admin.id, data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível salvar o produto." };
  }

  // Fotos enviadas antes de o produto existir (tela de criação) — anexadas agora que já há um id.
  const imageUrls = formData.getAll("imageUrls").filter((v): v is string => typeof v === "string" && v.length > 0);
  for (const url of imageUrls) await addProductImage(admin.id, id, url, null);

  revalidatePath("/admin/produtos");
  redirect(`/admin/produtos/${id}`);
}

export async function toggleProductAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await toggleProductActive(admin.id, id);
  revalidatePath("/admin/produtos");
}

export async function saveVariantAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const raw = formDataToObject(formData);
  const productId = String(formData.get("productId") ?? "");
  const parsed = variantSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    if (raw.id) await updateVariant(admin.id, raw.id, parsed.data);
    else await createVariant(admin.id, productId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível salvar a variação." };
  }
  revalidatePath(`/admin/produtos/${productId}`);
  return { ok: true, message: "Variação salva." };
}

export async function deleteVariantAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const productId = String(formData.get("productId") ?? "");
  if (id) await deleteVariant(admin.id, id);
  revalidatePath(`/admin/produtos/${productId}`);
}

export async function addImageAction(productId: string, url: string): Promise<void> {
  const admin = await requireAdmin();
  await addProductImage(admin.id, productId, url, null);
  revalidatePath(`/admin/produtos/${productId}`);
}

export async function deleteImageAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const productId = String(formData.get("productId") ?? "");
  if (id) await deleteProductImage(admin.id, id);
  revalidatePath(`/admin/produtos/${productId}`);
}

export interface CsvImportState extends FormState {
  imported?: number;
  csvErrors?: { line: number; message: string }[];
}

export async function importCsvAction(_prev: CsvImportState, formData: FormData): Promise<CsvImportState> {
  const admin = await requireAdmin();
  const limit = await checkRateLimits([{ key: `csv-import:admin:${admin.id}`, limit: 10, windowSeconds: 3600 }]);
  if (!limit.ok) return { error: rateLimitMessage(limit.retryAfterSeconds) };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione um arquivo CSV." };
  if (file.size > 2 * 1024 * 1024) return { error: "Arquivo muito grande (máximo 2 MB)." };

  const text = await file.text();
  const result = await importProductsFromCsv(admin.id, text);
  revalidatePath("/admin/produtos");
  if (result.errors.length > 0 && result.imported === 0) return { error: "Nenhuma linha pôde ser importada. Corrija e tente de novo.", csvErrors: result.errors };
  return { ok: true, message: `${result.imported} variação(ões) importada(s)${result.errors.length > 0 ? `, ${result.errors.length} linha(s) com erro` : ""}.`, imported: result.imported, csvErrors: result.errors };
}

export async function exportCsvAction(): Promise<string> {
  await requireAdmin();
  const products = await prisma.product.findMany({ include: { brand: true, variants: true } });
  const rows = products.flatMap((p) =>
    p.variants.map((v) => ({ brand: p.brand.name, product: p.name, gender: p.gender, concentration: p.concentration, family: p.olfactoryFamily, sizeMl: v.sizeMl, priceCents: v.priceCents, compareAtCents: v.compareAtCents, stockQty: v.stockQty, weightGrams: v.weightGrams, heightCm: v.heightCm, widthCm: v.widthCm, lengthCm: v.lengthCm, description: p.description, notesTop: p.notesTop, notesHeart: p.notesHeart, notesBase: p.notesBase })),
  );
  return buildProductsCsv(rows);
}
