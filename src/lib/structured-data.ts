/**
 * Dados estruturados (JSON-LD) puros — sem depender do banco, fáceis de testar.
 * A entidade da loja (Organization/OnlineStore) é declarada na home (src/app/page.tsx);
 * aqui fica só o WebSite, que é global ao site inteiro (ativa a caixa de busca do Google).
 */
export function buildWebsiteSchema(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: siteUrl,
    potentialAction: { "@type": "SearchAction", target: `${siteUrl}/perfumes?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };
}

/** Escapa "<" para o script JSON-LD nunca poder ser interpretado como fechamento de tag por engano. */
export const toJsonLdScript = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
