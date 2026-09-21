import { onlyDigits } from "./utils";

export interface CepAddress {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export const normalizeCep = (input: string) => onlyDigits(input);
export const isValidCep = (input: string) => normalizeCep(input).length === 8;
export const formatCep = (input: string) => normalizeCep(input).replace(/^(\d{5})(\d{0,3})$/, (_, a, b) => (b ? `${a}-${b}` : a));

/** Faixa inclusiva de CEP (8 dígitos). Usada nas zonas de entrega própria. */
export function cepInRange(cep: string, start: string, end: string): boolean {
  const c = Number(normalizeCep(cep));
  return isValidCep(cep) && c >= Number(normalizeCep(start)) && c <= Number(normalizeCep(end));
}

async function getJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** ViaCEP primeiro, BrasilAPI como reserva. Retorna null se nenhum encontrar. */
export async function lookupCep(input: string): Promise<CepAddress | null> {
  const cep = normalizeCep(input);
  if (cep.length !== 8) return null;

  const via = (await getJson(`https://viacep.com.br/ws/${cep}/json/`)) as Record<string, string | boolean> | null;
  if (via && !via.erro && typeof via.logradouro === "string") {
    return {
      cep,
      street: String(via.logradouro ?? ""),
      neighborhood: String(via.bairro ?? ""),
      city: String(via.localidade ?? ""),
      state: String(via.uf ?? ""),
    };
  }

  const br = (await getJson(`https://brasilapi.com.br/api/cep/v1/${cep}`)) as Record<string, string> | null;
  if (br && br.city) {
    return { cep, street: br.street ?? "", neighborhood: br.neighborhood ?? "", city: br.city, state: br.state ?? "" };
  }
  return null;
}
