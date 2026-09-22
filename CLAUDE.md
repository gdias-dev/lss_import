# LS Imports — E-commerce de perfumaria

Este arquivo é lido em toda sessão. O briefing completo está em `docs/briefing.pdf` (fonte da verdade). Se algo não estiver lá, trate como não definido e pergunte. Responda sempre em português do Brasil.

## Projeto
- Cliente: LS Imports (Instagram @lss.import), perfumes de várias marcas. Visual preto e dourado, luxuoso, que transmita confiança.
- Vende para o Brasil todo. Entrega própria e pagamento na entrega apenas em zonas locais.
- Desenvolvedor responsável: intermediário que revende o projeto ao cliente final. Explique o "porquê" das decisões.

## Stack
Next.js (App Router) + TypeScript, Tailwind + shadcn/ui, PostgreSQL (Neon ou Supabase), Prisma, Auth.js, Zod + React Hook Form, Cloudinary, Resend, Melhor Envio, ViaCEP (fallback BrasilAPI), Vercel. Testes: Vitest e Playwright.
Verifique a documentação atual antes de fixar versões e antes de usar APIs de terceiros. Não assuma parâmetros de memória.

## Regras inegociáveis
1. Nunca armazenar, logar ou trafegar dados de cartão pelo servidor. Usar tokenização do gateway no navegador.
2. Todo valor em centavos (inteiros). Preço, desconto, frete, parcelas e total são calculados e recalculados no SERVIDOR.
3. Baixa de estoque atômica em transação, com condição. Nunca vender além do estoque.
4. Pedido guarda snapshot de nome, preço e endereço.
5. Webhooks: validar assinatura, ser idempotente e consultar o status na API do gateway.
6. Pagamentos atrás da interface `PaymentProvider` (o gateway ainda não foi escolhido). Débito online fica atrás de configuração.
7. Itens PENDENTES viram configuração no painel ou variável de ambiente, com padrão documentado. Nunca inventar CNPJ, WhatsApp, endereço ou taxas.
8. Segredos só em variáveis de ambiente. `.env` nunca vai para o Git. Rate limit em login, recuperação de senha e cupom. Rotas admin protegidas no servidor.
9. LGPD: coleta mínima, política de privacidade, logs sem dados pessoais.
10. Sem urgência artificial (contagem regressiva de carrinho).

## Escopo
Dentro: catálogo com variações, conta obrigatória, carrinho, cupons, checkout (Pix, cartão crédito e débito, pagamento na entrega), frete Correios (Melhor Envio) e entrega própria por zonas, pedido pronto no WhatsApp, e-mails de status, painel admin com importação CSV.
Fase 2: avaliações com moderação, relatórios de vendas, nota fiscal.
Fora: blog, página Sobre, FAQ, feed do Instagram, pixels de anúncio, programa de fidelidade. Páginas legais mínimas são obrigatórias (privacidade, termos, trocas e devoluções).

## Decisões aprovadas (Etapa A concluída)
- **CPF é pedido no checkout**, não no cadastro. `User.cpf` é opcional no banco e obrigatório para pagar e para nota fiscal.
- **Avaliações:** o cliente só avalia um produto depois que o admin marca o pedido como ENTREGUE (sem liberação automática por prazo). Se isso gerar poucas avaliações, revisitar.
- **Primeiro gateway: Mercado Pago (sandbox)**, atrás da interface `PaymentProvider`. Débito online desligado por configuração.
- Valores padrão das pendências: ver `docs/etapa-a-aprovacao.md`. Modelo de dados aprovado: `prisma/schema.prisma`.
- **Etapas 1, 2 e 3 concluídas** (base, tema preto e dourado, layout, home, páginas legais em rascunho, catálogo com filtros, facetas, ordenação, paginação, busca e página de produto com seletor de tamanho).
- **Etapas 1 a 10 concluídas.** O projeto principal está funcionalmente completo (falta só ligar a etiqueta automática do Melhor Envio no admin, deixado de propósito na Etapa 9, e a Fase 2: avaliações, relatórios, nota fiscal).
- **Bug real corrigido na Etapa 10:** produtos editados no admin não revalidavam `/`, `/perfumes` nem `/produto/[slug]` — o cliente podia continuar vendo preço/estoque/foto antigos indefinidamente (cache do Next.js). Corrigido centralizando `revalidateStorefront()` dentro de `src/server/admin/products.ts`, chamada por toda mutação de produto/variação/imagem. QUALQUER nova tela de admin que edite algo visível na loja precisa lembrar de revalidar o caminho correspondente.
- **CSP adicionada** em `next.config.ts`, liberando apenas mercadopago.com (SDK de pagamento) e Cloudinary (imagens). Usa `'unsafe-inline'` em script-src como concessão pragmática (sem nonce por requisição) — documentado no arquivo. NUNCA testada num navegador real; antes de produção, testar um pagamento com o console aberto.
- **SEO:** dados estruturados `OnlineStore` na home e `BreadcrumbList` na página do produto, além do `Product` que já existia.
- **`docs/GO-LIVE.md`** criado: checklist ordenado para publicar de verdade, separado do `docs/PENDENCIAS.md` (que é a lista solta do que falta). Ao resolver uma etapa dos dois arquivos, marcar como feito em vez de deixar acumular.

- **Admin:** `requireAdmin()` em toda página (`src/server/auth/guards.ts`). Primeiro admin criado por `npm run make-admin -- email` (script em `scripts/make-admin.ts`), nunca por cadastro comum — o papel `ADMIN` não é atribuível pelo próprio usuário.
- **CSV de produtos:** parser e gerador PUROS e testados em `src/server/admin/csv.ts` (aceita aspas com vírgula dentro, vírgula ou ponto decimal). A importação (`csv-import.ts`) faz upsert por nome+marca (produto) e por tamanho (variação) — nunca duplica ao reimportar a mesma planilha.
- **Zonas de entrega — formato do campo de faixa de CEP:** o separador do intervalo é a palavra **"a"** (ex.: `20000-000 a 20099-999`), nunca o hífen sozinho, porque o CEP formatado já usa hífen e criaria ambiguidade. Isso foi um bug real corrigido durante a Etapa 9 — não reverter para separador por hífen.
- **Upload de imagem:** assinado (`src/server/admin/cloudinary.ts`), o arquivo vai direto do navegador para o Cloudinary, nunca passa pelo nosso servidor. NUNCA testado contra credenciais reais.
- **Pendência deixada de propósito:** compra automática de etiqueta e rastreio do Melhor Envio (`addShipmentToCart`, `checkoutShipments`, `generateLabels`, `printLabels`, `trackShipments`, todos prontos desde a Etapa 7) ainda não tem botão no admin — hoje o campo "código de rastreio" em `OrderStatusForm` é preenchido manualmente. Ligar isso é o primeiro item pendente da Etapa 9.

- **E-mails de status:** `src/server/orders/notifications.ts` decide qual e-mail mandar e para quem; `src/server/emails/order-templates.ts` tem os textos. Já ligados no `checkout.ts`: confirmação (nos 3 caminhos de sucesso do `placeOrder`), pagamento confirmado (`reconcilePayment`) e cancelamento (dentro de `cancelAndRestoreStock`, então cobre Pix expirado, cartão recusado e falha do gateway com uma única chamada). `sendOrderShippedEmail` e `sendOrderDeliveredEmail` já existem, prontos para os botões da Etapa 9.
- **Nunca vazar erro técnico ao cliente:** `publicCancelReason()` traduz a razão interna do cancelamento (estoque, expiração, recusa) para um texto amigável antes de ir no e-mail.
- **Aviso ao dono:** `notifyAdminNewOrder()` manda para `STORE_OWNER_EMAIL` (variável de ambiente) e para todo usuário com papel `ADMIN` — hoje nenhum admin existe ainda (criado na Etapa 9), então configurar `STORE_OWNER_EMAIL` é o único jeito de já receber o aviso.

- **Frete:** `src/server/shipping/melhorenvio.ts` faz a cotação real (Correios e parceiros) via `/api/v2/me/shipment/calculate`, usando token único da loja (sem OAuth). NUNCA testado contra a API de verdade (sem internet neste ambiente) — revisar em sandbox. Se o token faltar ou a chamada falhar, `src/lib/shipping.ts` cai sozinho para uma tabela de contingência (nunca lança erro, o checkout não pode travar por causa disso).
- **Compra de etiqueta e rastreio já estão na camada de serviço** (`addShipmentToCart`, `checkoutShipments`, `generateLabels`, `printLabels`, `trackShipments`), mas sem UI — ligar isso no painel admin (Etapa 9), no botão de marcar pedido como enviado.

- **Pagamentos:** interface `PaymentProvider` em `src/server/payments/`, implementação Mercado Pago em `mercadopago.ts` (`/v1/payments`). NUNCA testado contra credenciais reais (sem internet neste ambiente) — revisar em sandbox. Núcleo do checkout em `src/server/checkout.ts`: recalcula tudo no servidor, reserva estoque em transação, cria o pedido, e só DEPOIS fala com o gateway (nunca segurar uma transação de banco esperando rede). Falha no gateway cancela o pedido e devolve o estoque (`cancelAndRestoreStock`).
- **Webhook** em `/api/webhooks/mercadopago`: valida assinatura HMAC (`MP_WEBHOOK_SECRET`), idempotente via `WebhookEvent` (provider+eventId), sempre confirma o status consultando a API antes de mudar o pedido (nunca confia só no payload). Reconciliação (`reconcilePayment`) é usada tanto pelo webhook quanto pelo polling da tela de confirmação do Pix.
- **Expiração do Pix:** `reservedUntil` no pedido; cron `/api/cron/expirar-pix` de hora em hora no `vercel.json` — mas o plano gratuito da Vercel só roda cron diário; documentado no README (usar cron-job.org ou rodar à mão).
- **Frete:** `src/lib/shipping.ts` tem uma tabela PROVISÓRIA dos Correios por região do CEP, claramente marcada para ser trocada na Etapa 7. Entrega própria já usa `DeliveryZone`/`DeliveryZoneRange` de verdade.
- CPF é pedido no checkout (não no cadastro) e salvo no perfil no primeiro pedido, como decidido na Etapa A.

- **Carrinho** (`src/lib/cart.ts` puro, `src/server/cart.ts` banco): exige login, guarda só variação e quantidade. Preço, estoque e cupom são recalculados a cada leitura e DEVEM ser recalculados de novo na criação do pedido. Máximo 10 por item e 30 itens diferentes.
- **Regras de cupom decididas**: um por carrinho; desconto só sobre os itens elegíveis (marca ou produto); valor mínimo conta sobre os itens elegíveis; cliente com `perUserLimit` conta pedidos não cancelados; `usedCount` sobe na CRIAÇÃO do pedido (Etapa 6), na mesma transação. Desconto do Pix vale sobre os produtos depois do cupom, nunca sobre o frete. Frete grátis por cupom ou por valor mínimo é aplicado na Etapa 7.
- **Autenticação própria em vez de Auth.js** (decisão da Etapa 4): Auth.js v5 segue em beta e o v4 é legado. Regras em `src/server/auth/service.ts` (sem banco, testáveis), repositório Prisma em `repo.prisma.ts`, cookie em `session.ts`. Sessão no banco (30 dias), senha com scrypt, tokens só em hash, `RateLimit` no banco.
- Toda página privada chama `requireUser()` (o layout não basta). `getCurrentUser()` lê o cookie primeiro, o que a mantém dinâmica. O cabeçalho NÃO lê cookies (links fixos), para a vitrine continuar em cache.
- E-mail do cliente não pode ser trocado pela conta (pedir à loja). Admin: papel `ADMIN` existe, criação do primeiro admin fica para a Etapa 9.
- O seletor de tamanho (`ProductPurchase`) já expõe a variação escolhida; o botão de carrinho entra na Etapa 5. Frete por CEP na página do produto entra na Etapa 7.
- Prisma fixado em 6.19.3 (`prisma.config.ts` fica para quando migrar para a v7). Next 16, React 19, Tailwind 4.

## Como trabalhar
- Uma etapa por vez, na ordem da seção 11 do briefing. Só avançar quando eu disser "próxima".
- Entregar código completo e pronto para rodar, com dados de exemplo (seed) e testes das regras críticas.
- Ao fim de cada etapa: como testar, o que foi feito, o que falta e riscos. Depois, commit com mensagem descritiva.
- Se eu pedir algo fora do escopo ou contra as regras acima, explique o impacto em prazo, custo ou risco antes de fazer.

## Pendências externas

Sempre que uma etapa gerar uma pendência que não dá para resolver escrevendo código (precisa de uma conta, um domínio, uma decisão do cliente etc.), adicione em `docs/PENDENCIAS.md` em vez de só mencionar no chat. Ao concluir uma pendência, marque como resolvida lá.

## Comandos
- Instalar: `npm install` (roda `prisma generate` sozinho)
- Desenvolvimento: `npm run dev`
- Checagens: `npm run typecheck`, `npm test`, `npm run build`
- Banco: `npm run db:migrate -- --name init`, depois `npm run db:constraints`, `npm run db:search` e `npm run db:seed`

## Convenções
- Regras de negócio em `src/lib` e `src/server` (funções puras e testáveis). Componentes só apresentam.
- Funções que leem o banco devem cair em fallback seguro (nunca derrubar a página) quando `DATABASE_URL` não existe.
- Todo texto ao cliente em português do Brasil. Toda regra de dinheiro tem teste em `tests/`.
- Estilo: Tailwind com os tokens de `src/app/globals.css` (`bg-ink`, `text-gold`, `text-ivory`...). Não usar cores soltas.
