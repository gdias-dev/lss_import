# Checklist técnico de lançamento

Diferente de `docs/PENDENCIAS.md` (o que falta configurar ou decidir), este arquivo é o **roteiro de testes** para rodar antes de anunciar a loja como "no ar de verdade". Vá marcando conforme testar.

## 1. Ambiente e configuração

- [ ] `.env` de produção preenchido na Vercel (nunca commitado): `DATABASE_URL`, `DIRECT_URL`, `AUTH`, `RESEND_API_KEY`, `EMAIL_FROM`, `WHATSAPP_NUMBER`, `MP_ACCESS_TOKEN` e `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` **de produção** (sem `TEST-`), `MP_WEBHOOK_SECRET`, `MELHORENVIO_TOKEN` de produção, `STORE_ORIGIN_CEP`, `CLOUDINARY_*`, `CRON_SECRET`, `STORE_OWNER_EMAIL`, `NEXT_PUBLIC_SITE_URL` com o domínio real
- [ ] Domínio configurado na Vercel e DNS apontando certo (confira com `dig` ou o próprio painel)
- [ ] Certificado HTTPS ativo (a Vercel emite automaticamente; só confirmar que carrega com cadeado)
- [ ] `npm run db:migrate:deploy` (ou equivalente) rodado no banco de produção — **nunca** rodar `db:seed` em produção com os dados fictícios
- [ ] `npm run db:constraints` e `npm run db:search` rodados uma vez no banco de produção
- [ ] Primeiro administrador criado com `npm run make-admin -- email-do-dono@...`

## 2. Compra de ponta a ponta (o mais importante)

Faça uma compra real, com dinheiro de verdade, e depois cancele/estorne:

- [ ] Pix: gerar, pagar de verdade pelo app do banco, confirmar que o pedido muda para "Pago" sozinho (webhook) em até 1 minuto
- [ ] Cartão de crédito: uma compra aprovada e, se possível, uma recusada de propósito (cartão sem limite) para ver a mensagem ao cliente
- [ ] Pagamento na entrega: simular um pedido nessa modalidade e confirmar manualmente no painel
- [ ] Conferir que o e-mail de cada etapa chegou (não só apareceu no terminal) e não caiu no spam
- [ ] Testar o botão de WhatsApp na confirmação do pedido

## 3. Webhook do Mercado Pago

- [ ] Cadastrado no painel do Mercado Pago apontando para `https://SEUDOMINIO/api/webhooks/mercadopago`
- [ ] `MP_WEBHOOK_SECRET` copiado para o `.env` de produção
- [ ] Simular uma notificação de teste pelo próprio painel do Mercado Pago e conferir nos logs da Vercel que ela foi aceita (não silenciosamente ignorada por assinatura inválida)

## 4. Frete

- [ ] Cotação real do Melhor Envio aparecendo no checkout (não a tabela de contingência) — se aparecer "estimativa" no nome da opção, o token não está configurado ou a chamada está falhando
- [ ] `STORE_ORIGIN_CEP` é o CEP de onde a loja realmente despacha
- [ ] Zonas de entrega própria cadastradas com os bairros e taxas reais (a de exemplo do seed pode ser desativada ou apagada)

## 5. E-mail

- [ ] Domínio verificado no Resend (SPF, DKIM, DMARC) — sem isso, os e-mails têm grande chance de cair no spam
- [ ] Cadastro, confirmação de e-mail, recuperação de senha e todos os e-mails de pedido testados com uma conta de e-mail de verdade (Gmail, Outlook), não só o próprio terminal

## 6. Cron (limpeza e expiração)

- [ ] `/api/cron/limpar` e `/api/cron/expirar-pix` configurados em algum agendador (a Vercel Hobby só roda cron 1x/dia — usar cron-job.org ou similar para o de expirar-pix, a cada 10-15 min)
- [ ] Testar manualmente uma vez cada rota com o `CRON_SECRET` certo, conferir que devolve `200` e não `401`

## 7. Segurança

- [ ] Cabeçalhos de segurança presentes (confira em [securityheaders.com](https://securityheaders.com) depois do domínio estar no ar): CSP, HSTS, X-Frame-Options, Referrer-Policy
- [ ] Nenhuma variável de ambiente com prefixo `NEXT_PUBLIC_` contém segredo (só `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, que são públicas por natureza)
- [ ] `.env` não está no repositório (confira com `git log --all --full-history -- .env`)
- [ ] Testar login errado várias vezes seguidas e confirmar que o limite de tentativas bloqueia (mensagem "muitas tentativas")

## 8. LGPD

- [ ] Textos de privacidade, termos e trocas revisados por quem entende de direito do consumidor (hoje são rascunhos) e com CNPJ e razão social preenchidos
- [ ] Aviso de cookies aparecendo no primeiro acesso e sumindo depois de aceitar

## 9. SEO

- [ ] Site enviado ao [Google Search Console](https://search.google.com/search-console) com o `sitemap.xml`
- [ ] Testar 2-3 páginas de produto na [ferramenta de teste de dados estruturados do Google](https://search.google.com/test/rich-results)
- [ ] Título e descrição de cada página revisados (confira em `view-source:` se o `<title>` faz sentido)

## 10. Desempenho

- [ ] Rodar o site publicado no [PageSpeed Insights](https://pagespeed.web.dev) — mirar acima de 90 no mobile
- [ ] Fotos dos produtos em tamanho razoável antes de subir (o Cloudinary otimiza, mas um arquivo de 10 MB ainda demora para o navegador processar o envio)

## 11. Depois de tudo publicado

- [ ] Backup automático do banco confirmado (o Neon faz point-in-time restore no plano pago; confirme o prazo de retenção)
- [ ] Convidar 2-3 pessoas de confiança para testar a compra antes de divulgar para o público
