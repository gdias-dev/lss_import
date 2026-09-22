import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/server/audit/log";

/** Toda mudança de produto pode afetar a home (destaques), a listagem e a própria página do produto. */
function revalidateStorefront(slug?: string | null) {
  revalidatePath("/");
  revalidatePath("/perfumes");
  if (slug) revalidatePath(`/produto/${slug}`);
}

export const listBrands = () => prisma.brand.findMany({ orderBy: { name: "asc" } });

export async function ensureBrand(adminId: string, name: string): Promise<string> {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const brand = await prisma.brand.upsert({ where: { slug }, update: {}, create: { name, slug } });
  if (brand.name !== name) return brand.id; // já existia
  await logAdminAction(adminId, "CREATE", "Brand", brand.id, null, brand);
  return brand.id;
}

const slugify = (name: string, suffix = "") =>
  `${name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}${suffix}`;

export async function uniqueProductSlug(name: string, excludeId?: string): Promise<string> {
  let slug = slugify(name);
  let n = 1;
  while (await prisma.product.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) } })) {
    slug = slugify(name, `-${++n}`);
  }
  return slug;
}

export const listAdminProducts = (q?: string) =>
  prisma.product.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { brand: { name: { contains: q, mode: "insensitive" } } }] } : undefined,
    orderBy: { createdAt: "desc" },
    include: { brand: true, variants: { orderBy: { sizeMl: "asc" } }, images: { orderBy: { position: "asc" } } },
  });

export const getAdminProduct = (id: string) => prisma.product.findUnique({ where: { id }, include: { brand: true, variants: { orderBy: { sizeMl: "asc" } }, images: { orderBy: { position: "asc" } } } });

export interface ProductInput {
  name: string;
  brandId: string;
  gender: "FEMININO" | "MASCULINO" | "UNISSEX";
  concentration: "EXTRAIT" | "PARFUM" | "EDP" | "EDT" | "COLOGNE" | "OUTRO";
  olfactoryFamily: string | null;
  description: string | null;
  notesTop: string | null;
  notesHeart: string | null;
  notesBase: string | null;
  longevity: string | null;
  projection: string | null;
  occasion: string | null;
  featured: boolean;
  active: boolean;
}

export async function createProduct(adminId: string, input: ProductInput): Promise<string> {
  const slug = await uniqueProductSlug(input.name);
  const product = await prisma.product.create({ data: { ...input, slug } });
  await logAdminAction(adminId, "CREATE", "Product", product.id, null, product);
  revalidateStorefront(slug);
  return product.id;
}

export async function updateProduct(adminId: string, id: string, input: ProductInput): Promise<void> {
  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) throw new Error("Produto não encontrado.");
  const slug = before.name !== input.name ? await uniqueProductSlug(input.name, id) : before.slug;
  const after = await prisma.product.update({ where: { id }, data: { ...input, slug } });
  await logAdminAction(adminId, "UPDATE", "Product", id, before, after);
  revalidateStorefront(slug);
  if (slug !== before.slug) revalidatePath(`/produto/${before.slug}`); // o endereço antigo precisa passar a mostrar 404
}

export async function toggleProductActive(adminId: string, id: string): Promise<void> {
  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) return;
  const after = await prisma.product.update({ where: { id }, data: { active: !before.active } });
  await logAdminAction(adminId, after.active ? "ACTIVATE" : "DEACTIVATE", "Product", id, before, after);
  revalidateStorefront(before.slug);
}

// ------------------------------------------------------------ variações

export interface VariantInput {
  label: string;
  sizeMl: number;
  priceCents: number;
  compareAtCents: number | null;
  stockQty: number;
  weightGrams: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
  active: boolean;
}

const skuFor = (productSlug: string, sizeMl: number) => `${productSlug}-${sizeMl}ML`.toUpperCase();

export async function createVariant(adminId: string, productId: string, input: VariantInput): Promise<void> {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { slug: true } });
  if (!product) throw new Error("Produto não encontrado.");
  let sku = skuFor(product.slug, input.sizeMl);
  let n = 1;
  while (await prisma.productVariant.findUnique({ where: { sku } })) sku = `${skuFor(product.slug, input.sizeMl)}-${++n}`;
  const variant = await prisma.productVariant.create({ data: { ...input, productId, sku } });
  await logAdminAction(adminId, "CREATE", "ProductVariant", variant.id, null, variant);
  revalidateStorefront(product.slug);
}

export async function updateVariant(adminId: string, id: string, input: VariantInput): Promise<void> {
  const before = await prisma.productVariant.findUnique({ where: { id }, include: { product: { select: { slug: true } } } });
  if (!before) throw new Error("Variação não encontrada.");
  const after = await prisma.$transaction(async (tx) => {
    const updated = await tx.productVariant.update({ where: { id }, data: input });
    if (input.stockQty !== before.stockQty) {
      await tx.stockMovement.create({ data: { variantId: id, delta: input.stockQty - before.stockQty, reason: "MANUAL_ADJUST", createdBy: adminId } });
    }
    return updated;
  });
  await logAdminAction(adminId, "UPDATE", "ProductVariant", id, before, after);
  revalidateStorefront(before.product.slug);
}

export async function deleteVariant(adminId: string, id: string): Promise<void> {
  const before = await prisma.productVariant.findUnique({ where: { id }, include: { product: { select: { slug: true } } } });
  if (!before) return;
  const usedInOrder = await prisma.orderItem.findFirst({ where: { variantId: id } });
  if (usedInOrder) {
    // preserva o histórico de pedidos: só desativa, nunca apaga uma variação já vendida
    await prisma.productVariant.update({ where: { id }, data: { active: false } });
    await logAdminAction(adminId, "DEACTIVATE", "ProductVariant", id, before, { reason: "tem pedidos associados, apenas desativada" });
  } else {
    await prisma.productVariant.delete({ where: { id } });
    await logAdminAction(adminId, "DELETE", "ProductVariant", id, before, null);
  }
  revalidateStorefront(before.product.slug);
}

// ------------------------------------------------------------ imagens

export async function addProductImage(adminId: string, productId: string, url: string, alt: string | null): Promise<void> {
  const [count, product] = await Promise.all([prisma.productImage.count({ where: { productId } }), prisma.product.findUnique({ where: { id: productId }, select: { slug: true } })]);
  const image = await prisma.productImage.create({ data: { productId, url, alt, position: count } });
  await logAdminAction(adminId, "CREATE", "ProductImage", image.id, null, image);
  revalidateStorefront(product?.slug);
}

export async function deleteProductImage(adminId: string, imageId: string): Promise<void> {
  const before = await prisma.productImage.findUnique({ where: { id: imageId }, include: { product: { select: { slug: true } } } });
  if (!before) return;
  await prisma.productImage.delete({ where: { id: imageId } });
  await logAdminAction(adminId, "DELETE", "ProductImage", imageId, before, null);
  revalidateStorefront(before.product.slug);
}

export async function reorderProductImages(adminId: string, productId: string, orderedIds: string[]): Promise<void> {
  await prisma.$transaction(orderedIds.map((id, position) => prisma.productImage.update({ where: { id }, data: { position } })));
  await logAdminAction(adminId, "UPDATE", "ProductImage", productId, null, { order: orderedIds });
}
