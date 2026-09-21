/** Todo valor monetário do sistema é inteiro em CENTAVOS. */

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

/** Converte "1.234,56", "12,5", "R$ 10" ou número em reais para centavos. */
export function toCents(value: string | number): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) throw new Error("Valor inválido");
    return Math.round(value * 100);
  }
  const cleaned = value.trim().replace(/[R$\s]/g, "");
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const n = Number(normalized);
  if (normalized === "" || !Number.isFinite(n) || n < 0) throw new Error("Valor inválido");
  return Math.round(n * 100);
}

/** Desconto percentual em centavos, limitado ao valor base. */
export function percentOf(cents: number, percent: number): number {
  return Math.min(cents, Math.max(0, Math.round((cents * percent) / 100)));
}

export interface InstallmentRules {
  /** Até quantas parcelas sem juros. */
  interestFreeMax: number;
  /** Valor mínimo de cada parcela (centavos). */
  minInstallmentCents: number;
  /** Taxa de juros mensal como decimal (0.0299 = 2,99%). 0 = nunca cobra juros. */
  monthlyRate: number;
  /** Teto de parcelas (padrão 12). */
  maxInstallments?: number;
}

export interface Installment {
  count: number;
  installmentCents: number;
  totalCents: number;
  interestCents: number;
  hasInterest: boolean;
}

/** Tabela Price: parcela = P × i ÷ (1 − (1 + i)^−n). */
export function buildInstallments(totalCents: number, rules: InstallmentRules): Installment[] {
  const cap = rules.maxInstallments ?? 12;
  const maxCount = rules.monthlyRate > 0 ? cap : Math.min(rules.interestFreeMax, cap);
  const out: Installment[] = [];

  for (let n = 1; n <= Math.max(1, maxCount); n++) {
    const hasInterest = n > 1 && n > rules.interestFreeMax && rules.monthlyRate > 0;
    let installmentCents: number;
    let total: number;
    if (hasInterest) {
      const i = rules.monthlyRate;
      installmentCents = Math.round((totalCents * i) / (1 - Math.pow(1 + i, -n)));
      total = installmentCents * n;
    } else {
      installmentCents = Math.round(totalCents / n);
      total = totalCents;
    }
    if (n > 1 && installmentCents < rules.minInstallmentCents) break;
    out.push({ count: n, installmentCents, totalCents: total, interestCents: total - totalCents, hasInterest });
  }
  return out;
}

/** Texto curto para vitrine: "3x de R$ 96,63 sem juros". Null se só existe pagamento à vista. */
export function bestInterestFreeLabel(totalCents: number, rules: InstallmentRules): string | null {
  const free = buildInstallments(totalCents, rules).filter((p) => p.count > 1 && !p.hasInterest);
  const best = free[free.length - 1];
  return best ? `${best.count}x de ${formatBRL(best.installmentCents)} sem juros` : null;
}
