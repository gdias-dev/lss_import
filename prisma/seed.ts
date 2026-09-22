/* Dados FICTÍCIOS para desenvolvimento. Marcas e perfumes inventados. Idempotente: pode rodar várias vezes. */
import { Concentration, CouponType, Gender, PrismaClient } from "@prisma/client";
import { DEFAULT_SETTINGS } from "../src/lib/settings-defaults";

const prisma = new PrismaClient();

const BRANDS = ["Maison Élan", "Oud Royal", "Nocturne Paris", "Casa Ámbar"];

type Seed = [name: string, brand: string, gender: Gender, conc: Concentration, family: string, top: string, heart: string, base: string, price100: number, featured?: boolean];

const PRODUCTS: Seed[] = [
  ["Élan Noir", "Maison Élan", "MASCULINO", "EDP", "Amadeirado aromático", "Bergamota, Pimenta rosa", "Lavanda, Cedro", "Âmbar, Patchouli", 28990, true],
  ["Élan Blanche", "Maison Élan", "FEMININO", "EDP", "Floral branco", "Pera, Flor de laranjeira", "Jasmim, Tuberosa", "Almíscar, Baunilha", 27990, true],
  ["Royal Oud Intense", "Oud Royal", "UNISSEX", "PARFUM", "Oriental amadeirado", "Açafrão, Cardamomo", "Oud, Rosa", "Âmbar, Sândalo", 39990, true],
  ["Royal Amber", "Oud Royal", "UNISSEX", "EDP", "Oriental âmbar", "Canela, Laranja", "Âmbar, Incenso", "Baunilha, Benjoim", 34990],
  ["Nocturne Homme", "Nocturne Paris", "MASCULINO", "EDT", "Aromático fougère", "Limão siciliano, Menta", "Gerânio, Sálvia", "Musgo de carvalho, Vetiver", 21990, true],
  ["Nocturne Femme", "Nocturne Paris", "FEMININO", "EDP", "Floral frutal", "Framboesa, Lichia", "Peônia, Rosa", "Almíscar, Cedro", 25990],
  ["Ámbar Doce", "Casa Ámbar", "FEMININO", "EDP", "Gourmand", "Pera, Caramelo", "Praliné, Flor de baunilha", "Baunilha, Fava tonka", 26990, true],
  ["Ámbar Especiado", "Casa Ámbar", "MASCULINO", "EDP", "Amadeirado especiado", "Cardamomo, Gengibre", "Tabaco, Cravo", "Couro, Cedro", 30990],
  ["Élan Sport", "Maison Élan", "MASCULINO", "EDT", "Aquático cítrico", "Toranja, Maçã verde", "Sálvia, Algas", "Cedro, Almíscar", 19990],
  ["Royal Rose", "Oud Royal", "FEMININO", "EDP", "Floral oriental", "Rosa turca, Framboesa", "Peônia, Oud suave", "Patchouli, Âmbar", 32990],
  ["Nocturne Unisex", "Nocturne Paris", "UNISSEX", "EDP", "Cítrico amadeirado", "Bergamota, Néroli", "Chá preto, Íris", "Vetiver, Cedro", 23990],
  ["Ámbar Cítrico", "Casa Ámbar", "UNISSEX", "EDT", "Cítrico fresco", "Tangerina, Limão", "Flor de laranjeira", "Âmbar branco", 17990],
];

const slugify = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const nice = (cents: number) => Math.round(cents / 1000) * 1000 - 10; // termina em ,90

async function main() {
  const brandIds = new Map<string, string>();
  for (const name of BRANDS) {
    const brand = await prisma.brand.upsert({ where: { slug: slugify(name) }, update: {}, create: { name, slug: slugify(name) } });
    brandIds.set(name, brand.id);
  }

  for (const [i, [name, brand, gender, concentration, family, top, heart, base, price100, featured]] of PRODUCTS.entries()) {
    const data = {
      name,
      slug: slugify(name),
      brandId: brandIds.get(brand)!,
      gender,
      concentration,
      olfactoryFamily: family,
      notesTop: top,
      notesHeart: heart,
      notesBase: base,
      description: `${name} é uma fragrância ${family.toLowerCase()} de personalidade marcante. Produto fictício para desenvolvimento.`,
      featured: Boolean(featured),
      active: true,
    };
    const product = await prisma.product.upsert({ where: { slug: data.slug }, update: data, create: data });

    const variants = [
      { label: "50 ml", sizeMl: 50, priceCents: nice(price100 * 0.62), weightGrams: 300, heightCm: 12, widthCm: 8, lengthCm: 8 },
      { label: "100 ml", sizeMl: 100, priceCents: price100, weightGrams: 500, heightCm: 16, widthCm: 10, lengthCm: 10 },
    ];
    for (const v of variants) {
      const sku = `${data.slug}-${v.sizeMl}`.toUpperCase();
      const stockQty = i === 11 ? 0 : ((i * 7 + v.sizeMl) % 15) + 3; // o último fica esgotado, para testar a vitrine
      const compareAtCents = i % 4 === 0 ? nice(v.priceCents * 1.2) : null;
      const fields = { label: v.label, sizeMl: v.sizeMl, priceCents: v.priceCents, compareAtCents, stockQty, weightGrams: v.weightGrams, heightCm: v.heightCm, widthCm: v.widthCm, lengthCm: v.lengthCm, active: true };
      await prisma.productVariant.upsert({ where: { sku }, update: fields, create: { ...fields, sku, productId: product.id } });
    }
  }

  // Cupons de EXEMPLO para testar o carrinho. Não sobrescreve se o dono já mudou algum.
  const COUPONS = [
    { code: "BEMVINDO10", type: CouponType.PERCENT, value: 10, minSubtotalCents: 0, perUserLimit: 1 },
    { code: "OFF20", type: CouponType.FIXED, value: 2000, minSubtotalCents: 15000, perUserLimit: null },
    { code: "FRETEGRATIS", type: CouponType.FREE_SHIPPING, value: 0, minSubtotalCents: 20000, perUserLimit: null },
  ];
  for (const c of COUPONS) await prisma.coupon.upsert({ where: { code: c.code }, update: {}, create: c });

  // Configurações: só cria as que faltam (não sobrescreve o que o dono já mudou).
  await prisma.setting.createMany({
    data: Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value: value as never })),
    skipDuplicates: true,
  });

  // Zonas de entrega própria de EXEMPLO. A do Centro do Rio fica ATIVA para dar pra testar o checkout;
  // o dono ajusta os valores reais (ou desativa) no painel.
  if ((await prisma.deliveryZone.count()) === 0) {
    await prisma.deliveryZone.create({
      data: { name: "Centro do Rio (EXEMPLO)", feeCents: 1500, freeAboveCents: 40000, allowsPayOnDelivery: true, estimatedDays: 2, active: true, neighborhoods: ["Centro"], ranges: { create: [{ cepStart: "20000000", cepEnd: "20099999" }] } },
    });
    await prisma.deliveryZone.create({
      data: { name: "Zona local (EXEMPLO, inativa)", feeCents: 1000, active: false, ranges: { create: [{ cepStart: "00000000", cepEnd: "00000000" }] } },
    });
  }

  console.log(`Seed concluído: ${BRANDS.length} marcas, ${PRODUCTS.length} produtos, ${COUPONS.length} cupons (BEMVINDO10, OFF20, FRETEGRATIS), zona de entrega no Centro do Rio (CEP 20000-000 a 20099-999).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
