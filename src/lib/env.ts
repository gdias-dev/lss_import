import { onlyDigits } from "./utils";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Sem DATABASE_URL o site funciona em modo "vitrine vazia" (útil no primeiro deploy e no CI). */
export const hasDatabase = Boolean(process.env.DATABASE_URL);

/** Número da loja com DDI e DDD, só dígitos. Retorna null se não configurado. */
export function getWhatsAppNumber(): string | null {
  const digits = onlyDigits(process.env.WHATSAPP_NUMBER ?? "");
  return digits.length >= 12 ? digits : null;
}
