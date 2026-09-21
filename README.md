# LS Imports — E-commerce

Loja virtual de perfumaria (Instagram @lss.import): catálogo com variações, conta obrigatória, carrinho, cupons, checkout com Pix, cartão e pagamento na entrega, frete Correios e entrega própria, pedido pronto no WhatsApp e painel administrativo.

Escopo completo: [`docs/briefing.pdf`](docs/briefing.pdf). Decisões aprovadas e valores padrão: [`docs/etapa-a-aprovacao.md`](docs/etapa-a-aprovacao.md).

## Status

| Etapa | Situação |
|---|---|
| 1. Base do projeto | Concluída |
| 2. Design system e layout | Concluída (home, cabeçalho, rodapé, WhatsApp, páginas legais em rascunho) |
| 3. Catálogo | Concluída: filtros (gênero, marca, concentração, família olfativa, tamanho, preço, disponibilidade), ordenação, paginação, busca sem acento e tolerante a erro de digitação, página de produto com seletor de tamanho, galeria e relacionados |
| 4. Conta e autenticação | Concluída: cadastro, login, sair, confirmação de e-mail, recuperação de senha, dados, endereços com busca de CEP, lista de pedidos |
| 5. Carrinho e cupons | Pendente |
| 6. Checkout e pagamentos (Mercado Pago) | Pendente |
| 7. Frete e entrega própria | Pendente |
| 8. WhatsApp do pedido e e-mails | Pendente (a função da mensagem já existe e tem teste) |
| 9. Painel admin | Pendente |
| 10. Qualidade e go-live | Pendente |
| 11. Fase 2: avaliações, relatórios, nota fiscal | Pendente |

## Requisitos

- Node.js 20.9 ou superior (recomendado 22 LTS) e Git
- Um banco PostgreSQL. Sugestão gratuita para desenvolvimento: [Neon](https://neon.tech) ou [Supabase](https://supabase.com)

## Como rodar

```bash
git clone https://github.com/gdias-dev/lss_import.git
cd lss_import
cp .env.example .env          # preencha DATABASE_URL e DIRECT_URL
npm install
npm run db:migrate -- --name init   # (se o banco já existe, nas próximas etapas use --name auth, e assim por diante)
npm run db:constraints        # estoque nunca negativo (pode repetir)
npm run db:search             # ativa a busca sem acento e tolerante a erro (pode repetir)
npm run db:seed               # 12 perfumes fictícios para testar
npm run dev                   # http://localhost:3000
```

Sem `DATABASE_URL`, o site abre normalmente com a vitrine vazia (útil para ver o layout). Login e conta precisam do banco.

Sem `RESEND_API_KEY`, em desenvolvimento os e-mails (confirmação e recuperação de senha) aparecem no **terminal** com o link para clicar. Não precisa de provedor de e-mail para testar.

Para o número do WhatsApp aparecer, preencha `WHATSAPP_NUMBER` no `.env` com DDI e DDD, só números (ex.: `5521999999999`).

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run typecheck` | Checagem de tipos |
| `npm test` | Testes (dinheiro, parcelas, CPF, CEP, WhatsApp, catálogo, autenticação, validadores, e-mails) |
| `npm run db:migrate` | Cria e aplica migrações (na Etapa 4: `-- --name auth`) |
| `npm run db:constraints` / `npm run db:search` | SQL manual: estoque não negativo; extensões da busca |
| `npm run db:seed` | Popula dados fictícios (pode rodar várias vezes) |
| `npm run db:studio` | Interface visual do banco |

## Estrutura

```
prisma/          schema, seed e SQL manual (manual/001_constraints.sql, 002_search.sql)
src/app/         rotas (home, perfumes, produto/[slug], páginas legais, robots, sitemap)
src/components/  componentes da loja
src/server/      autenticação (senha, sessão, tokens), limite de tentativas, e-mails, endereços
src/lib/         regras puras e testáveis: money, cpf, cep, whatsapp, settings, catalog-filters (filtros, facetas, ordem, página)
tests/           Vitest
docs/            briefing e decisões
```

## Antes de publicar

- Substituir o logo provisório em texto (`src/components/loja/Logo.tsx`) pelo arquivo oficial do cliente e ajustar as cores em `src/app/globals.css`.
- Confirmar com o cliente os textos de vitrine que afirmam qualidade e autenticidade. Só publicar o que a loja consegue comprovar.
- Revisar as páginas legais com contador ou advogado e preencher razão social, CNPJ e e-mail.
- Valores provisórios de parcelamento, frete grátis e Pix estão em `src/lib/settings-defaults.ts` e passam a ser editáveis no painel (Etapa 9).
- Para uso comercial, hospedar em plano pago (o gratuito da Vercel é restrito a uso não comercial) ou em outro provedor.

## Autenticação

Autenticação própria, pequena e testada (Auth.js v5 ainda está em beta e o v4 é legado): senha com scrypt, sessão no banco com cookie httpOnly (`__Host-` em produção), tokens de e-mail de uso único guardados só em hash, limite de tentativas no banco e mensagens que não revelam quais e-mails têm conta. Regras em `src/server/auth/service.ts`.

Em produção defina `RESEND_API_KEY`, `EMAIL_FROM` (domínio verificado no Resend), `NEXT_PUBLIC_SITE_URL` e `CRON_SECRET` (limpeza diária de sessões, definida em `vercel.json`).

## Segurança

Nunca commite o `.env`. Dados de cartão nunca passam pelo servidor.
