import { describe, expect, it } from "vitest";
import { buildWebsiteSchema, toJsonLdScript } from "@/lib/structured-data";

describe("dados estruturados", () => {
  it("website inclui a ação de busca apontando para /perfumes", () => {
    const schema = buildWebsiteSchema("https://lssimports.com.br");
    expect(schema.potentialAction.target).toBe("https://lssimports.com.br/perfumes?q={search_term_string}");
  });

  it("escapa '<' para o script nunca fechar a tag por engano", () => {
    expect(toJsonLdScript({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});
