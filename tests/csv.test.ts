import { describe, expect, it } from "vitest";
import { buildProductsCsv, parseProductsCsv } from "@/server/admin/csv";

const HEADER = "marca,produto,genero,concentracao,familia,tamanho_ml,preco,preco_de,estoque,peso_g,altura_cm,largura_cm,comprimento_cm,descricao,notas_topo,notas_coracao,notas_fundo";

describe("parseProductsCsv", () => {
  it("lê uma linha válida completa", () => {
    const csv = `${HEADER}\nMaison Élan,Élan Noir,masculino,edp,Amadeirado,100,289.90,349.90,10,500,16,10,10,Descrição teste,Bergamota,Cedro,Âmbar`;
    const { rows, errors } = parseProductsCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ brand: "Maison Élan", product: "Élan Noir", gender: "MASCULINO", concentration: "EDP", sizeMl: 100, priceCents: 28990, compareAtCents: 34990, stockQty: 10, weightGrams: 500 });
  });

  it("aceita campos entre aspas com vírgula dentro (padrão Excel)", () => {
    const csv = `${HEADER}\nCasa Ámbar,"Ámbar, Edição Especial",feminino,edp,Gourmand,50,199.90,,5,300,12,8,8,,,,`;
    const { rows, errors } = parseProductsCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0]!.product).toBe("Ámbar, Edição Especial");
    expect(rows[0]!.compareAtCents).toBeNull();
  });

  it("aceita vírgula ou ponto decimal no preço", () => {
    const csv = `${HEADER}\nMarca,Produto,unissex,edt,,50,"199,90",,5,300,12,8,8,,,,`;
    expect(parseProductsCsv(csv).rows[0]!.priceCents).toBe(19990);
  });

  it("acusa coluna obrigatória faltando", () => {
    const { errors } = parseProductsCsv("marca,produto\nX,Y");
    expect(errors[0]!.message).toMatch(/Colunas faltando/);
  });

  it("acusa gênero e concentração inválidos, apontando a linha certa", () => {
    const csv = `${HEADER}\nMarca,Produto,invalido,zzz,,50,100,,5,300,12,8,8,,,,`;
    const { rows, errors } = parseProductsCsv(csv);
    expect(rows).toHaveLength(0);
    expect(errors.map((e) => e.line)).toEqual([2, 2]);
    expect(errors[0]!.message).toMatch(/Gênero inválido/);
  });

  it("uma linha com erro não impede as outras de importar", () => {
    const csv = `${HEADER}\nMarca,Bom,feminino,edp,,50,100,,5,300,12,8,8,,,,\nMarca,Ruim,xxx,edp,,50,100,,5,300,12,8,8,,,,\nMarca,Bom2,masculino,edt,,50,100,,5,300,12,8,8,,,,`;
    const { rows, errors } = parseProductsCsv(csv);
    expect(rows.map((r) => r.product)).toEqual(["Bom", "Bom2"]);
    expect(errors).toHaveLength(1);
  });

  it("valida números de estoque, peso e dimensões", () => {
    const csv = `${HEADER}\nMarca,Produto,feminino,edp,,50,100,,-1,0,0,0,0,,,,`;
    const { errors } = parseProductsCsv(csv);
    expect(errors.map((e) => e.message).join(" ")).toMatch(/Estoque inválido/);
    expect(errors.map((e) => e.message).join(" ")).toMatch(/Peso.*inválido/);
    expect(errors.map((e) => e.message).join(" ")).toMatch(/Altura, largura ou comprimento/);
  });

  it("arquivo vazio dá erro claro", () => {
    expect(parseProductsCsv("").errors[0]!.message).toBe("Arquivo vazio.");
  });
});

describe("buildProductsCsv", () => {
  it("gera um CSV que o próprio parser lê de volta sem erro", () => {
    const csv = buildProductsCsv([{ brand: "Marca, Especial", product: "Produto \"X\"", gender: "FEMININO", concentration: "EDP", family: "Floral", sizeMl: 100, priceCents: 28990, compareAtCents: null, stockQty: 5, weightGrams: 500, heightCm: 16, widthCm: 10, lengthCm: 10, description: null, notesTop: null, notesHeart: null, notesBase: null }]);
    const { rows, errors } = parseProductsCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ brand: "Marca, Especial", product: 'Produto "X"', priceCents: 28990 });
  });
});

describe("limite de linhas", () => {
  it("recusa um arquivo com mais linhas do que o permitido", async () => {
    const { MAX_CSV_ROWS } = await import("@/server/admin/csv");
    const body = Array.from({ length: MAX_CSV_ROWS + 1 }, (_, i) => `Marca,Produto ${i},feminino,edp,,50,100,,5,300,12,8,8,,,,`).join("\n");
    const { rows, errors } = parseProductsCsv(`${HEADER}\n${body}`);
    expect(rows).toHaveLength(0);
    expect(errors[0]!.message).toMatch(/Máximo de/);
  });

  it("aceita um arquivo dentro do limite", async () => {
    const { MAX_CSV_ROWS } = await import("@/server/admin/csv");
    const body = Array.from({ length: MAX_CSV_ROWS }, (_, i) => `Marca,Produto ${i},feminino,edp,,50,100,,5,300,12,8,8,,,,`).join("\n");
    const { rows, errors } = parseProductsCsv(`${HEADER}\n${body}`);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(MAX_CSV_ROWS);
  });
});
