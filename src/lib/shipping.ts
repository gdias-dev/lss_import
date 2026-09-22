/**
 * Cálculo de frete. Os Correios e demais transportadoras vêm da cotação real do Melhor Envio
 * (src/server/shipping/melhorenvio.ts). A tabela abaixo é só CONTINGÊNCIA: entra em ação quando o
 * Melhor Envio não está configurado (token ausente) ou a chamada falha, para o checkout nunca travar
 * por causa disso. Entrega própria usa as zonas cadastradas no painel (faixa de CEP e/ou bairro).
 */
import { cepInRange, normalizeCep } from "./cep";
import { formatBRL } from "./money";

export type ShippingMethodValue = "CORREIOS" | "LOCAL_DELIVERY" | "PICKUP";

export interface ShippingOption {
  key: string; // identifica a opção no formulário (ex.: "correios-pac", "local-<zoneId>", "pickup")
  method: ShippingMethodValue;
  service: string | null; // "PAC", "SEDEX", nome da zona...
  label: string;
  costCents: number;
  etaDays: number;
  allowsPayOnDelivery: boolean;
  zoneId: string | null;
}

// Tabela provisória por região do CEP (1º dígito). Valores fictícios para desenvolvimento.
const CORREIOS_TABLE: Record<string, { pac: { base: number; perKg: number; days: number }; sedex: { base: number; perKg: number; days: number } }> = {
  "0": { pac: { base: 2200, perKg: 350, days: 6 }, sedex: { base: 3500, perKg: 500, days: 2 } }, // SP capital/região
  "1": { pac: { base: 2400, perKg: 380, days: 7 }, sedex: { base: 3800, perKg: 550, days: 2 } }, // SP interior
  "2": { pac: { base: 2000, perKg: 320, days: 5 }, sedex: { base: 3200, perKg: 480, days: 1 } }, // RJ/ES
  "3": { pac: { base: 2300, perKg: 350, days: 6 }, sedex: { base: 3600, perKg: 520, days: 2 } }, // MG
  "4": { pac: { base: 2600, perKg: 400, days: 8 }, sedex: { base: 4000, perKg: 580, days: 3 } }, // BA/SE
  "5": { pac: { base: 2800, perKg: 420, days: 9 }, sedex: { base: 4300, perKg: 600, days: 3 } }, // PE/AL/PB/RN
  "6": { pac: { base: 3200, perKg: 460, days: 10 }, sedex: { base: 4800, perKg: 650, days: 4 } }, // Norte/Nordeste
  "7": { pac: { base: 2500, perKg: 380, days: 7 }, sedex: { base: 3900, perKg: 540, days: 2 } }, // DF/GO/TO/MT/MS
  "8": { pac: { base: 2300, perKg: 360, days: 6 }, sedex: { base: 3700, perKg: 520, days: 2 } }, // PR/SC
  "9": { pac: { base: 2400, perKg: 370, days: 6 }, sedex: { base: 3800, perKg: 530, days: 2 } }, // RS
};

const kg = (grams: number) => Math.max(1, Math.ceil(grams / 1000)); // fração de kg conta como 1kg a mais

/** Tabela de contingência — só usada quando a cotação real do Melhor Envio não está disponível. */
export function correiosFallbackOptions(cep: string, weightGrams: number): ShippingOption[] {
  const digit = normalizeCep(cep).charAt(0);
  const table = CORREIOS_TABLE[digit] ?? CORREIOS_TABLE["1"]!;
  const extraKg = kg(weightGrams) - 1;
  const cost = (t: { base: number; perKg: number; days: number }) => t.base + extraKg * t.perKg;
  return [
    { key: "correios-fallback-pac", method: "CORREIOS", service: "PAC (estimativa)", label: `Correios PAC — estimativa (até ${table.pac.days} dias úteis)`, costCents: cost(table.pac), etaDays: table.pac.days, allowsPayOnDelivery: false, zoneId: null },
    { key: "correios-fallback-sedex", method: "CORREIOS", service: "SEDEX (estimativa)", label: `Correios SEDEX — estimativa (até ${table.sedex.days} dias úteis)`, costCents: cost(table.sedex), etaDays: table.sedex.days, allowsPayOnDelivery: false, zoneId: null },
  ];
}

export interface DeliveryZoneInput {
  id: string;
  name: string;
  feeCents: number;
  freeAboveCents: number | null;
  neighborhoods: string[];
  allowsPayOnDelivery: boolean;
  estimatedDays: number | null;
  ranges: { cepStart: string; cepEnd: string }[];
}

const normalizeText = (s: string) => s.trim().toLocaleLowerCase("pt-BR");

/** Zona bate por faixa de CEP OU por nome de bairro (comparação sem acentuar/maiúsculas seria melhor, mas mantemos simples e exato após trim). */
export function matchDeliveryZone(zones: DeliveryZoneInput[], cep: string, neighborhood: string): DeliveryZoneInput | null {
  const neigh = normalizeText(neighborhood);
  return zones.find((z) => z.ranges.some((r) => cepInRange(cep, r.cepStart, r.cepEnd)) || z.neighborhoods.some((n) => normalizeText(n) === neigh)) ?? null;
}

export interface BuildOptionsInput {
  cep: string;
  neighborhood: string;
  weightGrams: number;
  zones: DeliveryZoneInput[];
  pickupEnabled: boolean;
  subtotalCentsForFreeShipping: number; // total dos produtos após cupom, usado contra o mínimo de frete grátis
  globalFreeShipping: boolean; // cupom de frete grátis ou valor mínimo geral da loja atingido
  /** Cotações reais já buscadas no Melhor Envio (server/shipping/melhorenvio.ts). Vazio = sem cotação disponível. */
  liveCorreiosOptions?: ShippingOption[];
}

export function buildShippingOptions(input: BuildOptionsInput): ShippingOption[] {
  // nunca mutar o array recebido (ele pode vir de um cache de cotação reaproveitado em outra chamada)
  const options = [...(input.liveCorreiosOptions && input.liveCorreiosOptions.length > 0 ? input.liveCorreiosOptions : correiosFallbackOptions(input.cep, input.weightGrams))];

  const zone = matchDeliveryZone(input.zones, input.cep, input.neighborhood);
  if (zone) {
    const freeByZone = zone.freeAboveCents !== null && input.subtotalCentsForFreeShipping >= zone.freeAboveCents;
    options.push({
      key: `local-${zone.id}`,
      method: "LOCAL_DELIVERY",
      service: zone.name,
      label: `Entrega própria — ${zone.name}${zone.estimatedDays ? ` (até ${zone.estimatedDays} dias)` : ""}`,
      costCents: freeByZone ? 0 : zone.feeCents,
      etaDays: zone.estimatedDays ?? 3,
      allowsPayOnDelivery: zone.allowsPayOnDelivery,
      zoneId: zone.id,
    });
  }

  if (input.pickupEnabled) {
    options.push({ key: "pickup", method: "PICKUP", service: null, label: "Retirar na loja", costCents: 0, etaDays: 1, allowsPayOnDelivery: true, zoneId: null });
  }

  if (input.globalFreeShipping) return options.map((o) => (o.costCents > 0 ? { ...o, costCents: 0, label: `${o.label} — grátis` } : o));
  return options;
}

export const findShippingOption = (options: ShippingOption[], key: string) => options.find((o) => o.key === key) ?? null;

export const shippingOptionSummary = (o: ShippingOption) => `${o.label} — ${o.costCents === 0 ? "grátis" : formatBRL(o.costCents)}`;
