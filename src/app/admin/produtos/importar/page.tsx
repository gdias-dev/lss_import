import type { Metadata } from "next";
import Link from "next/link";
import { CsvExportButton } from "@/components/admin/CsvExportButton";
import { CsvImportForm } from "@/components/admin/CsvImportForm";
import { requireAdmin } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Importar produtos" };

export default async function ImportProductsPage() {
  await requireAdmin();
  return (
    <div>
      <Link href="/admin/produtos" className="mb-6 inline-block text-sm text-muted transition hover:text-gold">
        ← Todos os produtos
      </Link>
      <h1 className="section-title mb-6">Importar produtos por CSV</h1>

      <div className="mb-10 max-w-2xl rounded-2xl border border-line bg-surface p-6 text-sm text-ivory/80">
        <p className="mb-3">Cada linha é uma variação (um tamanho). Repita o mesmo nome de produto e marca para juntar vários tamanhos no mesmo produto.</p>
        <p className="mb-3 font-medium text-ivory">Colunas obrigatórias (nessa ordem, com esse nome no cabeçalho):</p>
        <code className="block overflow-x-auto rounded-lg bg-ink-soft p-3 text-xs text-gold">
          marca, produto, genero, concentracao, familia, tamanho_ml, preco, preco_de, estoque, peso_g, altura_cm, largura_cm, comprimento_cm, descricao, notas_topo, notas_coracao, notas_fundo
        </code>
        <ul className="mt-3 list-inside list-disc space-y-1">
          <li>
            <strong>genero:</strong> feminino, masculino ou unissex
          </li>
          <li>
            <strong>concentracao:</strong> extrait, parfum, edp, edt, colonia ou outro
          </li>
          <li>preco e preco_de em reais (aceita vírgula ou ponto), preco_de pode ficar em branco</li>
          <li>Um produto que já existe (mesmo nome e marca) é atualizado; um tamanho que já existe tem o estoque e o preço atualizados</li>
        </ul>
      </div>

      <div className="max-w-xl">
        <CsvImportForm />
      </div>

      <div className="mt-10">
        <h2 className="mb-4 font-serif text-xl text-ivory">Exportar</h2>
        <CsvExportButton />
      </div>
    </div>
  );
}
