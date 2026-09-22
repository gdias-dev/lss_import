# Checklist de go-live

Siga nesta ordem. Cada item tem uma forma de confirmar que está realmente pronto — não marque só de olho.

## 1. Antes de tudo

- [ ] CNPJ ou MEI do cliente ativo
- [ ] Domínio comprado e apontado (DNS) para a Vercel
- [ ] Conta do Mercado Pago **de produção** criada em nome do cliente, com CNPJ vinculado

## 2. Variáveis de ambiente de produção

Confira uma por uma no painel da Vercel (nunca reaproveite as de teste):

- [ ] `DATABASE_URL` / `DIRECT_URL` — banco de produção (pode ser o mesmo Neon, em outro branch, ou um projeto separado)
- [ ] `NEXT_PUBLIC_SITE_URL` — o domínio real, com `https://`
- [ ] `RESEND_API_KEY` + `EMAIL_FROM` — com o **domínio verificado** no Resend (veja item 4)
- [ ] `MELHORENVIO_TOKEN` (produção, não sandbox) + `MELHORENVIO_SANDBOX=false` + `STORE_ORIGIN_CEP`
- [ ] `MP_ACCESS_TOKEN` + `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` — as de **produção** (sem prefixo `TEST-`)
- [ ] `MP_WEBHOOK_SECRET` — gerado depois de cadastrar a URL do webhook (item 6)
- [ ] `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`
- [ ] `CRON_SECRET` — uma senha longa qualquer, inventada por você
- [ ] `STORE_OWNER_EMAIL` — quem recebe o aviso de novo pedido além dos admins cadastrados

## 3. Banco de dados de produção

- [ ] `npm run db:deploy` (roda `prisma migrate deploy`) contra o banco de produção
- [ ] `npm run db:constraints` e `npm run db:search` rodados uma vez
- [ ] **NÃO rode `db:seed` em produção** — ele foi feito para dados de teste
- [ ] Primeiro produto de verdade cadastrado pelo painel (ou importado por CSV)
- [ ] `npm run make-admin -- email-do-dono@...` rodado com a variável `DATABASE_URL` de produção

## 4. E-mail

- [ ] Domínio verificado no Resend (SPF, DKIM, DMARC) — confira o status "Verified" no painel
- [ ] Um e-mail de teste (cadastro, recuperação de senha) chegou de verdade, sem cair no spam

## 5. Frete

- [ ] `STORE_ORIGIN_CEP` é o CEP real de onde a loja despacha
- [ ] Peso e dimensões dos produtos cadastrados batem com a realidade (afeta o preço do frete)
- [ ] Zonas de entrega própria cadastradas com taxas e bairros reais (a de exemplo do seed pode ser apagada)
- [ ] Uma cotação de frete real testada no checkout, com CEP de verdade

## 6. Pagamento — o passo mais importante

- [ ] Site publicado com domínio final (o webhook não funciona em `localhost`)
- [ ] No painel do Mercado Pago, cadastre a URL do webhook: `https://seudominio.com.br/api/webhooks/mercadopago`
- [ ] Copie o **Webhook Secret** gerado e coloque em `MP_WEBHOOK_SECRET`
- [ ] **Faça uma compra real de valor baixo** (Pix e cartão) com dinheiro de verdade e confirme:
  - [ ] O pagamento aparece como aprovado no site
  - [ ] O e-mail de confirmação chega
  - [ ] O dinheiro aparece na conta do Mercado Pago do cliente
  - [ ] Estorne essa compra de teste depois

## 7. Cron (tarefas automáticas)

- [ ] Configurado um serviço externo (ex.: cron-job.org) chamando `/api/cron/expirar-pix` a cada 10-15 minutos, com o cabeçalho `Authorization: Bearer <CRON_SECRET>`
- [ ] `/api/cron/limpar` continua no `vercel.json` (roda 1x por dia automaticamente, sem configuração extra)

## 8. LGPD e páginas legais

- [ ] Política de privacidade, termos e trocas revisados com o CNPJ e a razão social reais (hoje têm campos `[RAZÃO SOCIAL]`, `[CNPJ]` para preencher)
- [ ] E-mail de contato para pedidos de acesso/exclusão de dados (LGPD art. 18) definido e testado
- [ ] Nenhum cookie de rastreamento ou anúncio está sendo usado (confirmado: este projeto não usa nenhum) — por isso não é necessário banner de cookies

## 9. Segurança

- [ ] `NODE_ENV=production` (a Vercel já define isso sozinha)
- [ ] Testado que `/admin` redireciona para o login quando deslogado
- [ ] Testado que uma conta comum não consegue abrir `/admin` (deve cair na home)
- [ ] Content-Security-Policy testada numa compra real (abra o console do navegador durante o checkout e confira se não aparece nenhum erro de CSP bloqueando o Mercado Pago)

## 10. SEO

- [ ] `NEXT_PUBLIC_SITE_URL` correto (afeta o sitemap e os dados estruturados)
- [ ] Site cadastrado no Google Search Console, com o sitemap (`/sitemap.xml`) enviado
- [ ] Logo e cores oficiais do cliente aplicadas (hoje o site usa um logo de texto provisório)

## 11. Por último

- [ ] Backup do banco confirmado (o Neon faz automaticamente, mas confira nas configurações do projeto)
- [ ] Plano pago da Vercel ativado, se o uso for comercial (o gratuito não é para isso)
- [ ] Avisar o cliente como acessar o painel (`/admin`) e onde encontrar este documento e o `docs/PENDENCIAS.md`
