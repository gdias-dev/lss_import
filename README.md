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
| 5. Carrinho e cupons | Concluída: adicionar pela página do produto, quantidade com limite de estoque, cupons (percentual, valor fixo, frete grátis), desconto no Pix e progresso do frete grátis |
| 6. Checkout e pagamentos (Mercado Pago) | Concluída: endereço, frete (placeholder Correios + zonas locais), Pix com QR Code, cartão de crédito/débito (Secure Fields), pagamento na entrega, webhook, expiração e cancelamento com devolução de estoque |
| 7. Frete e entrega própria | Concluída: cotação real dos Correios/transportadoras via Melhor Envio no checkout, com tabela de contingência se a API falhar; compra de etiqueta e rastreio prontos para o painel (Etapa 9) |
| 8. WhatsApp do pedido e e-mails | Concluída: e-mails de status (pedido recebido, pagamento confirmado, cancelado) e aviso ao dono a cada novo pedido; enviado/entregue prontos para o painel (Etapa 9) ligar |
| 9. Painel admin | Concluída: produtos com variações e fotos, importação/exportação CSV, pedidos com mudança de status, cupons, zonas de entrega, configurações, banners, log de auditoria |
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
npm run db:seed               # 12 perfumes, 3 cupons (BEMVINDO10, OFF20, FRETEGRATIS) e 1 zona de entrega (Centro do Rio)
npm run make-admin -- seu-email@exemplo.com   # promove uma conta já cadastrada a administrador
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

## Pendências (o que falta e não depende de código)

Veja [`docs/PENDENCIAS.md`](docs/PENDENCIAS.md) para a lista completa e sempre atualizada: credenciais do Mercado Pago, configuração do cron de expiração do Pix, decisões do cliente e o que falta para publicar de verdade.

## Antes de publicar

- Substituir o logo provisório em texto (`src/components/loja/Logo.tsx`) pelo arquivo oficial do cliente e ajustar as cores em `src/app/globals.css`.
- Confirmar com o cliente os textos de vitrine que afirmam qualidade e autenticidade. Só publicar o que a loja consegue comprovar.
- Revisar as páginas legais com contador ou advogado e preencher razão social, CNPJ e e-mail.
- Valores provisórios de parcelamento, frete grátis e Pix estão em `src/lib/settings-defaults.ts` e passam a ser editáveis no painel (Etapa 9).
- Para uso comercial, hospedar em plano pago (o gratuito da Vercel é restrito a uso não comercial) ou em outro provedor.

## Pagamentos e checkout

Gateway: Mercado Pago (Checkout API, `/v1/payments`), atrás da interface `PaymentProvider` (`src/server/payments/`) — trocar de gateway no futuro é escrever outra implementação dessa interface. **Nada foi testado contra credenciais reais do Mercado Pago** (o ambiente de desenvolvimento não tem acesso à internet nem a uma conta de sandbox); revise em modo de testes antes de publicar.

Variáveis necessárias:
- `MP_ACCESS_TOKEN` — chave privada (usar a de teste primeiro)
- `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` — chave pública, usada no navegador para gerar o token do cartão (nunca o número do cartão em si)
- `MP_WEBHOOK_SECRET` — chave secreta do webhook (painel do Mercado Pago → Webhooks). Sem ela, o site não valida quem está mandando a notificação — funciona, mas fica exposto a notificações falsas.

Fluxo: o checkout recalcula tudo no servidor (preço, estoque, cupom, frete), reserva o estoque de forma atômica, cria o pedido e só depois fala com o gateway. Pix expira em `pixExpirationMinutes` (padrão 30). O cron `/api/cron/expirar-pix` cancela pedidos de Pix vencidos e devolve o estoque — o plano gratuito da Vercel só permite cron diário, então configure um serviço externo como o cron-job.org batendo nessa URL a cada 10-15 minutos com o cabeçalho `Authorization: Bearer <CRON_SECRET>`, ou rode manualmente enquanto isso não estiver resolvido.

Frete: os Correios e transportadoras parceiras usam a cotação real do **Melhor Envio** (`src/server/shipping/melhorenvio.ts`). Se o token não estiver configurado ou a API falhar, o site cai sozinho para uma tabela de contingência (`src/lib/shipping.ts`) — o cliente sempre vê algum preço, nunca uma tela quebrada. A entrega própria usa as zonas cadastradas no banco (o seed cria uma no Centro do Rio).

Variáveis do Melhor Envio (veja `docs/PENDENCIAS.md` para o passo a passo de criar a conta e o token):
- `MELHORENVIO_TOKEN` — token gerado direto no painel do Melhor Envio (sem OAuth, é o certo para uma loja só)
- `MELHORENVIO_SANDBOX` — `true` em desenvolvimento; mude para `false` em produção
- `STORE_ORIGIN_CEP` — CEP de onde a loja despacha (obrigatório para a cotação funcionar)

Compra de etiqueta, impressão e rastreio já estão prontos em `src/server/shipping/melhorenvio.ts`, mas **sem botão na tela ainda** — a Etapa 9 (painel admin) vai chamar essas funções quando o lojista marcar um pedido como "Enviado".

## E-mails de status do pedido

Disparados automaticamente pelo checkout (`src/server/orders/notifications.ts`), sem precisar de nada além do Resend já configurado:
- Pedido recebido (texto diferente para Pix pendente, cartão em análise ou pagamento na entrega)
- Pagamento confirmado
- Pedido cancelado (estoque insuficiente, Pix expirado ou cartão recusado — o cliente nunca vê a mensagem técnica de erro)
- Aviso para quem toma conta da loja a cada novo pedido: envia para `STORE_OWNER_EMAIL` (se configurado no `.env`) e para qualquer usuário com papel `ADMIN`

Prontos para usar, mas **sem botão na tela ainda** (a Etapa 9 liga): e-mail de "pedido enviado" (com código de rastreio) e "pedido entregue".

## Painel administrativo

Em `/admin`, só acessível a contas com papel `ADMIN`. Como criar o primeiro admin: cadastre uma conta normal pelo site e rode `npm run make-admin -- email@exemplo.com`.

- **Produtos**: cadastro completo, variações (tamanho, preço, estoque, peso e medidas), fotos (upload direto para o Cloudinary, veja `CLOUDINARY_*` no `.env`) e importação/exportação por CSV (uma linha = uma variação; repetir produto e marca junta os tamanhos)
- **Pedidos**: lista com filtro, detalhe, mudança de status (em separação → enviado → entregue), confirmação manual de pagamento na entrega. Ao marcar como enviado ou entregue, o e-mail correspondente (Etapa 8) é disparado sozinho
- **Cupons, zonas de entrega e configurações da loja**: formulários diretos sobre o que já existia no banco desde etapas anteriores
- **Banners**: aparecem na home entre o topo e os diferenciais; sem nenhum cadastrado, a home simplesmente não mostra essa seção
- **Log de auditoria**: toda mudança de preço, estoque, status de pedido e configuração fica registrada em `AuditLog`, com quem fez e o antes/depois

Pendente para a Etapa 9 ficar 100% completa: **compra automática da etiqueta e rastreio pelo Melhor Envio** — hoje, ao marcar um pedido como enviado, o admin precisa gerar a etiqueta por fora e colar o código de rastreio manualmente. A integração com o Melhor Envio para isso já existe (`src/server/shipping/melhorenvio.ts`, desde a Etapa 7), só falta o botão chamando essas funções.

## Autenticação

Autenticação própria, pequena e testada (Auth.js v5 ainda está em beta e o v4 é legado): senha com scrypt, sessão no banco com cookie httpOnly (`__Host-` em produção), tokens de e-mail de uso único guardados só em hash, limite de tentativas no banco e mensagens que não revelam quais e-mails têm conta. Regras em `src/server/auth/service.ts`.

Em produção defina `RESEND_API_KEY`, `EMAIL_FROM` (domínio verificado no Resend), `NEXT_PUBLIC_SITE_URL` e `CRON_SECRET` (limpeza diária de sessões, definida em `vercel.json`).

## Segurança

Nunca commite o `.env`. Dados de cartão nunca passam pelo servidor.
