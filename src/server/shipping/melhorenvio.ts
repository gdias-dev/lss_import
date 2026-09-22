/**
 * Integração com o Melhor Envio (https://docs.melhorenvio.com.br). As funções "build*" e "map*" são
 * puras e testáveis sem rede; "fetch*"/"call*" fazem a chamada HTTP de verdade. NUNCA testado contra
 * credenciais reais (sem internet neste ambiente) — revisar em sandbox antes de confiar em produção.
 *
 * Autenticação: um único token por loja (gerado direto no painel do Melhor Envio, sem fluxo OAuth —
 * é o modelo certo para uma loja própria, diferente de um marketplace com vários vendedores).
 */
import { onlyDigits } from "@/lib/utils";
import type { ShippingOption } from "@/lib/shipping";

const BASE_URL = () => (process.env.MELHORENVIO_SANDBOX === "false" ? "https://www.melhorenvio.com.br" : "https://sandbox.melhorenvio.com.br");

export interface QuoteProduct {
  id: string;
  width: number; // cm
  height: number; // cm
  length: number; // cm
  weight: number; // kg
  insurance_value: number; // reais, valor do item para fins de seguro
  quantity: number;
}

export interface QuoteRequestBody {
  from: { postal_code: string };
  to: { postal_code: string };
  products: QuoteProduct[];
}

export function buildQuoteRequestBody(originCep: string, destinationCep: string, products: QuoteProduct[]): QuoteRequestBody {
  return { from: { postal_code: onlyDigits(originCep) }, to: { postal_code: onlyDigits(destinationCep) }, products };
}

/** Uma linha do carrinho vira um "produto" na cotação; o Melhor Envio calcula a embalagem sozinho. */
export function cartLineToQuoteProduct(line: { variantId: string; heightCm: number; widthCm: number; lengthCm: number; weightGrams: number; priceCents: number; quantity: number }): QuoteProduct {
  return {
    id: line.variantId,
    height: Math.max(2, line.heightCm),
    width: Math.max(11, line.widthCm),
    length: Math.max(16, line.lengthCm), // mínimos aceitos pelos Correios para encomendas
    weight: Math.max(0.1, line.weightGrams / 1000),
    insurance_value: Math.round(line.priceCents) / 100,
    quantity: line.quantity,
  };
}

export interface MelhorEnvioQuote {
  id: number | string;
  name: string; // nome do serviço, ex.: "PAC", "SEDEX"
  price: string | number;
  delivery_time: number | null;
  company: { id: number; name: string };
  error?: string | null;
}

/** Descarta cotações com erro (transportadora indisponível para o trajeto, dimensão fora do limite etc.). */
export function mapQuotesToShippingOptions(quotes: MelhorEnvioQuote[]): ShippingOption[] {
  return quotes
    .filter((q) => !q.error)
    .map((q) => ({
      key: `correios-me-${q.id}`,
      method: "CORREIOS" as const,
      service: `${q.company.name} ${q.name}`,
      label: `${q.company.name} ${q.name}${q.delivery_time ? ` (até ${q.delivery_time} dias úteis)` : ""}`,
      costCents: Math.round(Number(q.price) * 100),
      etaDays: q.delivery_time ?? 7,
      allowsPayOnDelivery: false,
      zoneId: null,
    }));
}

function isConfigured(): boolean {
  return Boolean(process.env.MELHORENVIO_TOKEN && process.env.STORE_ORIGIN_CEP);
}

async function callMelhorEnvio<T>(path: string, init: RequestInit): Promise<T> {
  const token = process.env.MELHORENVIO_TOKEN;
  const response = await fetch(`${BASE_URL()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      // Exigido pelo Melhor Envio: identifica a aplicação que está chamando a API.
      "User-Agent": process.env.MELHORENVIO_USER_AGENT || "LS Imports (contato@lssimports.com.br)",
      ...init.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Melhor Envio respondeu ${response.status} em ${path}`);
  return (await response.json()) as T;
}

/**
 * Cotação real dos Correios/transportadoras para o CEP de destino. Retorna [] (nunca lança) quando o
 * token não está configurado ou a API falha — quem chama (src/lib/shipping.ts) cai para a tabela de
 * contingência nesse caso, para o checkout nunca travar por causa do Melhor Envio estar fora do ar.
 */
export async function fetchLiveShippingOptions(destinationCep: string, products: QuoteProduct[]): Promise<ShippingOption[]> {
  if (!isConfigured() || products.length === 0) return [];
  try {
    const body = buildQuoteRequestBody(process.env.STORE_ORIGIN_CEP!, destinationCep, products);
    const quotes = await callMelhorEnvio<MelhorEnvioQuote[]>("/api/v2/me/shipment/calculate", { method: "POST", body: JSON.stringify(body) });
    return mapQuotesToShippingOptions(quotes);
  } catch (error) {
    console.error("[melhor-envio] cotação indisponível, usando tabela de contingência", error);
    return [];
  }
}

// ------------------------------------------------------------------------------------------------
// Compra de etiqueta e rastreio. Preparado para a Etapa 9 (painel admin) chamar quando o lojista
// marcar um pedido como "Enviado" — ainda sem botão na tela, só a camada de serviço.
// Fluxo: carrinho -> checkout (debita a carteira) -> gerar etiqueta -> imprimir -> rastrear.
// ------------------------------------------------------------------------------------------------

export interface ShipmentParty {
  name: string;
  phone: string;
  email?: string;
  document: string; // CPF (só dígitos)
  companyDocument?: string; // CNPJ, se pessoa jurídica
  address: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  stateAbbr: string;
  postalCode: string;
}

export interface AddToCartInput {
  serviceId: number | string;
  agencyId?: number;
  from: ShipmentParty;
  to: ShipmentParty;
  products: QuoteProduct[];
  orderNumber: string; // vai em "invoice.number" / referência
}

export function buildAddToCartBody(input: AddToCartInput) {
  const party = (p: ShipmentParty) => ({
    name: p.name,
    phone: onlyDigits(p.phone),
    email: p.email,
    ...(p.document ? { document: onlyDigits(p.document) } : {}),
    ...(p.companyDocument ? { company_document: onlyDigits(p.companyDocument) } : {}),
    address: p.address,
    number: p.number,
    complement: p.complement || undefined,
    district: p.district,
    city: p.city,
    state_abbr: p.stateAbbr,
    postal_code: onlyDigits(p.postalCode),
    country_id: "BR",
  });
  return {
    service: input.serviceId,
    ...(input.agencyId ? { agency: input.agencyId } : {}),
    from: party(input.from),
    to: party(input.to),
    products: input.products.map((p) => ({ name: `Item ${p.id}`, quantity: p.quantity, unitary_value: p.insurance_value })),
    volumes: input.products.map((p) => ({ height: p.height, width: p.width, length: p.length, weight: p.weight })),
    options: { non_commercial: true, insurance_value: input.products.reduce((sum, p) => sum + p.insurance_value * p.quantity, 0), receipt: false, own_hand: false, reverse: false, platform: "LS Imports" },
  };
}

export const buildOrdersBody = (cartItemIds: string[]) => ({ orders: cartItemIds });

export async function addShipmentToCart(input: AddToCartInput): Promise<{ id: string }> {
  return callMelhorEnvio<{ id: string }>("/api/v2/me/cart", { method: "POST", body: JSON.stringify(buildAddToCartBody(input)) });
}

/** Confirma a compra e debita a carteira do Melhor Envio (por isso nunca é chamado automaticamente). */
export async function checkoutShipments(cartItemIds: string[]): Promise<unknown> {
  return callMelhorEnvio("/api/v2/me/shipment/checkout", { method: "POST", body: JSON.stringify(buildOrdersBody(cartItemIds)) });
}

export async function generateLabels(cartItemIds: string[]): Promise<unknown> {
  return callMelhorEnvio("/api/v2/me/shipment/generate", { method: "POST", body: JSON.stringify(buildOrdersBody(cartItemIds)) });
}

export async function printLabels(cartItemIds: string[]): Promise<{ url: string }> {
  return callMelhorEnvio<{ url: string }>("/api/v2/me/shipment/print", { method: "POST", body: JSON.stringify({ ...buildOrdersBody(cartItemIds), mode: "private" }) });
}

export interface TrackingInfo {
  protocol: string;
  status: string;
  tracking: string | null;
}

/** Resultado tem cache de 1h no lado do Melhor Envio — não adianta consultar com mais frequência que isso. */
export async function trackShipments(cartItemIds: string[]): Promise<Record<string, TrackingInfo>> {
  return callMelhorEnvio<Record<string, TrackingInfo>>("/api/v2/me/shipment/tracking", { method: "POST", body: JSON.stringify(buildOrdersBody(cartItemIds)) });
}
