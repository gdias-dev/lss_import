/**
 * Importação/exportação de produtos por CSV. Regras puras e testadas: uma linha por variação
 * (o mesmo "slug" repetido em várias linhas junta tudo no mesmo produto).
 * Colunas: marca, produto, genero, concentracao, familia, tamanho_ml, preco, preco_de, estoque,
 *          peso_g, altura_cm, largura_cm, comprimento_cm, descricao, notas_topo, notas_coracao, notas_fundo
 */
const HEADER = ["marca", "produto", "genero", "concentracao", "familia", "tamanho_ml", "preco", "preco_de", "estoque", "peso_g", "altura_cm", "largura_cm", "comprimento_cm", "descricao", "notas_topo", "notas_coracao", "notas_fundo"] as const;

/** Acima disso a ação levaria tempo demais (cada linha grava no banco em sequência). Dividir em arquivos menores. */
export const MAX_CSV_ROWS = 2000;

export interface CsvRow {
  line: number;
  brand: string;
  product: string;
  gender: "FEMININO" | "MASCULINO" | "UNISSEX";
  concentration: "EXTRAIT" | "PARFUM" | "EDP" | "EDT" | "COLOGNE" | "OUTRO";
  family: string | null;
  sizeMl: number;
  priceCents: number;
  compareAtCents: number | null;
  stockQty: number;
  weightGrams: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
  description: string | null;
  notesTop: string | null;
  notesHeart: string | null;
  notesBase: string | null;
}

export interface CsvError {
  line: number;
  message: string;
}

const GENDER_MAP: Record<string, CsvRow["gender"]> = { feminino: "FEMININO", masculino: "MASCULINO", unissex: "UNISSEX" };
const CONCENTRATION_MAP: Record<string, CsvRow["concentration"]> = { extrait: "EXTRAIT", parfum: "PARFUM", edp: "EDP", edt: "EDT", colonia: "COLOGNE", cologne: "COLOGNE", outro: "OUTRO" };

function parseCsvLines(text: string): string[][] {
  // parser simples com suporte a campos entre aspas contendo vírgula (padrão CSV/Excel)
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") pushField();
    else if (c === "\n") pushRow();
    else field += c;
  }
  if (field.length > 0 || row.length > 0) pushRow();
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const toNumber = (v: string) => Number(v.trim().replace(",", "."));

export function parseProductsCsv(text: string): { rows: CsvRow[]; errors: CsvError[] } {
  const lines = parseCsvLines(text);
  const errors: CsvError[] = [];
  if (lines.length === 0) return { rows: [], errors: [{ line: 0, message: "Arquivo vazio." }] };

  const header = lines[0]!.map((h) => h.trim().toLowerCase());
  const missing = HEADER.filter((h) => !header.includes(h));
  if (missing.length > 0) return { rows: [], errors: [{ line: 1, message: `Colunas faltando: ${missing.join(", ")}` }] };
  const idx = Object.fromEntries(HEADER.map((h) => [h, header.indexOf(h)])) as Record<(typeof HEADER)[number], number>;
  if (lines.length - 1 > MAX_CSV_ROWS) return { rows: [], errors: [{ line: 1, message: `Máximo de ${MAX_CSV_ROWS} linhas por arquivo (este tem ${lines.length - 1}). Divida em arquivos menores.` }] };

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!;
    const line = i + 1;
    const get = (key: (typeof HEADER)[number]) => (cols[idx[key]] ?? "").trim();

    const brand = get("marca");
    const product = get("produto");
    const genderRaw = get("genero").toLowerCase();
    const concRaw = get("concentracao").toLowerCase();
    const sizeMl = toNumber(get("tamanho_ml"));
    const priceCents = Math.round(toNumber(get("preco")) * 100);
    const stockQty = toNumber(get("estoque"));
    const weightGrams = toNumber(get("peso_g"));
    const heightCm = toNumber(get("altura_cm"));
    const widthCm = toNumber(get("largura_cm"));
    const lengthCm = toNumber(get("comprimento_cm"));

    if (!brand) errors.push({ line, message: "Marca em branco." });
    if (!product) errors.push({ line, message: "Nome do produto em branco." });
    if (!GENDER_MAP[genderRaw]) errors.push({ line, message: `Gênero inválido: "${get("genero")}" (use feminino, masculino ou unissex).` });
    if (!CONCENTRATION_MAP[concRaw]) errors.push({ line, message: `Concentração inválida: "${get("concentracao")}".` });
    if (!Number.isFinite(sizeMl) || sizeMl <= 0) errors.push({ line, message: "Tamanho (ml) inválido." });
    if (!Number.isFinite(priceCents) || priceCents <= 0) errors.push({ line, message: "Preço inválido." });
    if (!Number.isFinite(stockQty) || stockQty < 0) errors.push({ line, message: "Estoque inválido." });
    if (!Number.isFinite(weightGrams) || weightGrams <= 0) errors.push({ line, message: "Peso (g) inválido." });
    if (![heightCm, widthCm, lengthCm].every((n) => Number.isFinite(n) && n > 0)) errors.push({ line, message: "Altura, largura ou comprimento inválidos." });

    const rowHasError = errors.some((e) => e.line === line);
    if (rowHasError) continue;

    const compareAtRaw = get("preco_de");
    rows.push({
      line,
      brand,
      product,
      gender: GENDER_MAP[genderRaw]!,
      concentration: CONCENTRATION_MAP[concRaw]!,
      family: get("familia") || null,
      sizeMl,
      priceCents,
      compareAtCents: compareAtRaw ? Math.round(toNumber(compareAtRaw) * 100) : null,
      stockQty,
      weightGrams,
      heightCm,
      widthCm,
      lengthCm,
      description: get("descricao") || null,
      notesTop: get("notas_topo") || null,
      notesHeart: get("notas_coracao") || null,
      notesBase: get("notas_fundo") || null,
    });
  }

  return { rows, errors };
}

const csvEscape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function buildProductsCsv(rows: { brand: string; product: string; gender: string; concentration: string; family: string | null; sizeMl: number; priceCents: number; compareAtCents: number | null; stockQty: number; weightGrams: number; heightCm: number; widthCm: number; lengthCm: number; description: string | null; notesTop: string | null; notesHeart: string | null; notesBase: string | null }[]): string {
  const genderOut: Record<string, string> = { FEMININO: "feminino", MASCULINO: "masculino", UNISSEX: "unissex" };
  const concOut: Record<string, string> = { EXTRAIT: "extrait", PARFUM: "parfum", EDP: "edp", EDT: "edt", COLOGNE: "colonia", OUTRO: "outro" };
  const lines = [
    HEADER.join(","),
    ...rows.map((r) =>
      [r.brand, r.product, genderOut[r.gender] ?? r.gender.toLowerCase(), concOut[r.concentration] ?? r.concentration.toLowerCase(), r.family ?? "", r.sizeMl, (r.priceCents / 100).toFixed(2), r.compareAtCents !== null ? (r.compareAtCents / 100).toFixed(2) : "", r.stockQty, r.weightGrams, r.heightCm, r.widthCm, r.lengthCm, r.description ?? "", r.notesTop ?? "", r.notesHeart ?? "", r.notesBase ?? ""]
        .map((v) => csvEscape(String(v)))
        .join(","),
    ),
  ];
  return lines.join("\n");
}
