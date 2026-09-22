import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/server/audit/log";
import { parseProductsCsv, type CsvError, type CsvRow } from "./csv";
import { ensureBrand, uniqueProductSlug } from "./products";

export interface ImportResult {
  imported: number;
  errors: CsvError[];
}

const skuFor = (slug: string, sizeMl: number) => `${slug}-${sizeMl}ML`.toUpperCase();

/** Uma linha = uma variação. Linhas com o mesmo produto+marca se juntam no mesmo produto (upsert por nome+marca). */
export async function importProductsFromCsv(adminId: string, csvText: string): Promise<ImportResult> {
  const { rows, errors } = parseProductsCsv(csvText);
  let imported = 0;
  const productIdByKey = new Map<string, string>();

  for (const row of rows) {
    try {
      const key = `${row.brand.toLowerCase()}::${row.product.toLowerCase()}`;
      let productId = productIdByKey.get(key);
      if (!productId) {
        const brandId = await ensureBrand(adminId, row.brand);
        const existing = await prisma.product.findFirst({ where: { name: row.product, brandId } });
        if (existing) {
          productId = existing.id;
        } else {
          const slug = await uniqueProductSlug(row.product);
          const created = await prisma.product.create({
            data: { name: row.product, slug, brandId, gender: row.gender, concentration: row.concentration, olfactoryFamily: row.family, description: row.description, notesTop: row.notesTop, notesHeart: row.notesHeart, notesBase: row.notesBase, active: true },
          });
          await logAdminAction(adminId, "CREATE", "Product", created.id, null, { source: "csv" });
          productId = created.id;
        }
        productIdByKey.set(key, productId);
      }
      await importVariantRow(adminId, productId, row);
      imported++;
    } catch (error) {
      errors.push({ line: row.line, message: error instanceof Error ? error.message : "Erro ao importar esta linha." });
    }
  }
  return { imported, errors };
}

async function importVariantRow(adminId: string, productId: string, row: CsvRow): Promise<void> {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { slug: true } });
  const existing = await prisma.productVariant.findFirst({ where: { productId, sizeMl: row.sizeMl } });
  const data = { priceCents: row.priceCents, compareAtCents: row.compareAtCents, stockQty: row.stockQty, weightGrams: row.weightGrams, heightCm: row.heightCm, widthCm: row.widthCm, lengthCm: row.lengthCm, active: true };

  if (existing) {
    await prisma.productVariant.update({ where: { id: existing.id }, data });
    if (data.stockQty !== existing.stockQty) await prisma.stockMovement.create({ data: { variantId: existing.id, delta: data.stockQty - existing.stockQty, reason: "IMPORT", createdBy: adminId } });
    return;
  }
  let sku = skuFor(product!.slug, row.sizeMl);
  let n = 1;
  while (await prisma.productVariant.findUnique({ where: { sku } })) sku = `${skuFor(product!.slug, row.sizeMl)}-${++n}`;
  await prisma.productVariant.create({ data: { ...data, productId, sku, sizeMl: row.sizeMl, label: `${row.sizeMl} ml` } });
}
