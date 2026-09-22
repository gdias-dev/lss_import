import { z } from "zod";
import { UF } from "./auth";

const percent0to100 = z.coerce.number().min(0).max(100);
const nonNegativeCents = z.coerce.number().int().min(0).max(100_000_000);

export const settingsSchema = z.object({
  storeName: z.string().trim().min(2).max(80),
  cnpj: z.string().trim().max(20).optional().transform((v) => v || null),
  whatsappNumber: z.string().trim().max(20).optional().transform((v) => v || ""),
  instagramUrl: z.string().trim().max(200).optional().transform((v) => v || ""),
  installmentsInterestFreeMax: z.coerce.number().int().min(1).max(12),
  minInstallmentCents: nonNegativeCents,
  monthlyInterestRate: z.coerce.number().min(0).max(0.2), // 0 a 20% ao mês
  pixDiscountPercent: percent0to100,
  freeShippingAboveCents: nonNegativeCents,
  debitEnabled: z.string().optional().transform((v) => v === "on"),
  pickupEnabled: z.string().optional().transform((v) => v === "on"),
  pixExpirationMinutes: z.coerce.number().int().min(5).max(180),
  handlingDays: z.coerce.number().int().min(0).max(30),
});

export const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,30}$/, "Use de 3 a 30 letras, números, hífen ou underline"),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  value: z.coerce.number().min(0),
  minSubtotalCents: nonNegativeCents,
  maxUses: z.string().optional().transform((v) => (v?.trim() ? Number(v) : null)),
  perUserLimit: z.string().optional().transform((v) => (v?.trim() ? Number(v) : null)),
  startsAt: z.string().optional().transform((v) => (v ? new Date(v) : null)),
  endsAt: z.string().optional().transform((v) => (v ? new Date(v) : null)),
  active: z.string().optional().transform((v) => v === "on"),
});

export const deliveryZoneSchema = z.object({
  name: z.string().trim().min(2).max(80),
  feeCents: nonNegativeCents,
  freeAboveCents: z.string().optional().transform((v) => (v?.trim() ? Math.round(Number(v.trim().replace(",", ".")) * 100) : null)),
  neighborhoods: z.string().trim().max(2000).optional().transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [])),
  // Separador do intervalo é a palavra "a" (ex.: "20000-000 a 20099-999"), nunca o hífen — que já faz
  // parte do próprio CEP formatado e criaria ambiguidade se também fosse o separador da faixa.
  cepRanges: z.string().trim().max(2000).optional().transform((v) =>
    (v ? v.split(",") : [])
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => {
        const [start, end] = r.split(/\s+a\s+/i).map((x) => x.replace(/\D/g, ""));
        return { cepStart: (start ?? "").padEnd(8, "0").slice(0, 8), cepEnd: (end ?? start ?? "").padEnd(8, "9").slice(0, 8) };
      }),
  ),
  allowsPayOnDelivery: z.string().optional().transform((v) => v === "on"),
  estimatedDays: z.string().optional().transform((v) => (v?.trim() ? Number(v) : null)),
  active: z.string().optional().transform((v) => v === "on"),
});

export const bannerSchema = z.object({
  title: z.string().trim().max(80).optional().transform((v) => v || null),
  imageUrl: z.string().trim().url("Cole a URL de uma imagem já hospedada"),
  linkUrl: z.string().trim().max(300).optional().transform((v) => v || null),
  position: z.coerce.number().int().min(0).max(999),
  active: z.string().optional().transform((v) => v === "on"),
});

const priceToCents = z.coerce.number().min(0).transform((v) => Math.round(v * 100));

export const productSchema = z.object({
  name: z.string().trim().min(2).max(150),
  brandId: z.string().min(10).max(40),
  gender: z.enum(["FEMININO", "MASCULINO", "UNISSEX"]),
  concentration: z.enum(["EXTRAIT", "PARFUM", "EDP", "EDT", "COLOGNE", "OUTRO"]),
  olfactoryFamily: z.string().trim().max(80).optional().transform((v) => v || null),
  description: z.string().trim().max(2000).optional().transform((v) => v || null),
  notesTop: z.string().trim().max(200).optional().transform((v) => v || null),
  notesHeart: z.string().trim().max(200).optional().transform((v) => v || null),
  notesBase: z.string().trim().max(200).optional().transform((v) => v || null),
  longevity: z.string().trim().max(80).optional().transform((v) => v || null),
  projection: z.string().trim().max(80).optional().transform((v) => v || null),
  occasion: z.string().trim().max(80).optional().transform((v) => v || null),
  featured: z.string().optional().transform((v) => v === "on"),
  active: z.string().optional().transform((v) => v === "on"),
});

export const variantSchema = z.object({
  label: z.string().trim().min(1).max(40),
  sizeMl: z.coerce.number().int().min(1).max(2000),
  priceCents: priceToCents,
  compareAtCents: z.string().optional().transform((v) => (v?.trim() ? Math.round(Number(v) * 100) : null)),
  stockQty: z.coerce.number().int().min(0).max(1_000_000),
  weightGrams: z.coerce.number().int().min(1).max(50_000),
  heightCm: z.coerce.number().int().min(1).max(200),
  widthCm: z.coerce.number().int().min(1).max(200),
  lengthCm: z.coerce.number().int().min(1).max(200),
  active: z.string().optional().transform((v) => v === "on"),
});

export const brandSchema = z.object({ name: z.string().trim().min(2).max(80) });

export const orderStatusSchema = z.object({
  status: z.enum(["EM_SEPARACAO", "ENVIADO", "ENTREGUE", "CANCELADO"]),
  trackingCode: z.string().trim().max(60).optional().transform((v) => v || null),
  carrier: z.string().trim().max(60).optional().transform((v) => v || null),
});

export { UF };
