# Pendências para o site funcionar 100%

Este arquivo junta tudo que **não dá para eu (Claude) resolver sozinho**, porque depende de uma conta, um documento ou uma decisão externa. Atualizado a cada etapa. Itens riscados (~~assim~~) já foram resolvidos.

## Bloqueiam vender de verdade (produção)

- [ ] **CNPJ ou MEI do cliente.** Sem isso, não dá para: abrir conta de recebimento em nome dele no Mercado Pago, nem emitir nota fiscal (Fase 2). Enquanto não sai, tudo roda em modo de teste.
- [ ] **Conta do Mercado Pago em nome do cliente**, com CNPJ/MEI vinculado. É para lá que o dinheiro das vendas vai cair.
- [ ] **Credenciais de PRODUÇÃO do Mercado Pago** (`MP_ACCESS_TOKEN` e `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` de produção, sem o prefixo `TEST-`). Só existem depois que a conta do cliente estiver ativa para vender.
- [ ] **Domínio publicado** (ex.: `lssimports.com.br`), para: configurar `NEXT_PUBLIC_SITE_URL` de produção, cadastrar o webhook do Mercado Pago (`MP_WEBHOOK_SECRET`) e verificar o domínio de e-mail no Resend.

## Configuração que dá para fazer agora (testes)

- [ ] **Criar o primeiro administrador**: cadastre uma conta normal no site e rode `npm run make-admin -- seu-email@exemplo.com`. Sem isso, o painel em `/admin` não tem quem entre.
- [ ] **Configurar o Cloudinary** (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` no `.env`) para conseguir subir fotos dos produtos pelo painel. Sem isso, o botão de enviar imagem no admin mostra erro.

- [ ] **Criar a aplicação no Mercado Pago Developers** e pegar as **credenciais de teste** (`MP_ACCESS_TOKEN` e `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, ambas de teste). Passo a passo já te expliquei no chat; posso reexplicar quando precisar.
- [ ] **Testar o checkout inteiro** com as credenciais de teste: Pix, cartão (com os cartões de teste do Mercado Pago) e pagamento na entrega.
- [ ] **Criar uma conta no Melhor Envio e gerar um token de sandbox** (não precisa de CNPJ para isso — funciona com CPF). No painel: Configurações → Tokens → Gerar novo token. Colar em `MELHORENVIO_TOKEN` no `.env`, junto com `STORE_ORIGIN_CEP` (o CEP de onde a loja vai despachar). Sem isso, o site usa uma tabela de frete estimada em vez do preço real.
- [ ] **`CRON_SECRET`**: qualquer senha longa e aleatória no `.env`. Usada para proteger as rotas de limpeza automática.
- [ ] **Rodar a expiração do Pix manualmente enquanto testa** (comando explicado no chat), até publicar o site.

## Depois que o site estiver publicado (Vercel)

- [ ] **Configurar o cron-job.org** (gratuito) para chamar `/api/cron/expirar-pix` a cada 10-15 minutos e `/api/cron/limpar` uma vez por dia, já que o plano gratuito da Vercel só roda cron diário. Passo a passo já explicado no chat.
- [ ] **Cadastrar a URL do webhook** (`https://seudominio.com.br/api/webhooks/mercadopago`) no painel do Mercado Pago e copiar o `MP_WEBHOOK_SECRET` gerado para o `.env` de produção.
- [ ] **Hospedagem em plano pago** (o gratuito da Vercel não é para uso comercial) ou outro provedor.
- [ ] **Verificar o domínio no Resend** (SPF, DKIM, DMARC) para os e-mails não caírem no spam.
- [ ] **Definir `STORE_OWNER_EMAIL`** no `.env` de produção, para o dono (ou você) receber um aviso por e-mail a cada novo pedido, até o primeiro admin ser criado no painel (Etapa 9).

## Decisões do cliente ainda pendentes

Lista completa em `docs/etapa-a-aprovacao.md`. As que mais afetam o código que falta escrever:

- [ ] Bairros/CEPs exatos onde a loja faz entrega própria e qual taxa cobrar (hoje só existe uma zona de EXEMPLO no Centro do Rio, criada pelo seed).
- [ ] Valor mínimo para frete grátis.
- [ ] Quantas parcelas sem juros e se/quando vai cobrar juros.
- [ ] Número de WhatsApp definitivo da loja.
- [ ] Logo e cores oficiais (hoje o site usa um logo de texto provisório e cores de referência).

## Bloqueiam vender de verdade (produção) — continuação

- [ ] **Conta de PRODUÇÃO do Melhor Envio com saldo.** O saldo de testes (sandbox) não vale em produção — é preciso depositar saldo real na conta do Melhor Envio para poder comprar etiquetas de verdade.
- [ ] **Endereço de origem completo no `.env`** para o botão de comprar etiqueta funcionar: `STORE_ORIGIN_STREET`, `STORE_ORIGIN_NUMBER`, `STORE_ORIGIN_NEIGHBORHOOD`, `STORE_ORIGIN_CITY`, `STORE_ORIGIN_STATE` (o `STORE_ORIGIN_CEP` já existia). Sem isso, o botão de comprar etiqueta fica desativado (mas o rastreio manual continua funcionando).
- [ ] **CNPJ da loja preenchido em Configurações** (`/admin/config`) — também necessário para a compra automática de etiqueta.

## Custos das APIs usadas (fora a hospedagem já orçada)

Nenhuma delas tem mensalidade fixa. Cada uma cobra do seu jeito:

| Serviço | Como cobra | Estimativa |
|---|---|---|
| **Mercado Pago** | Taxa (%) só em cima de cada venda aprovada. Sem custo para criar a conta, testar ou ficar sem vender. | Varia por forma de pagamento e plano da conta — conferir no painel da conta do cliente quando ela existir (a taxa muda com frequência). |
| **Melhor Envio** | A plataforma é grátis. Cobra é o preço da própria postagem (o valor real do frete), igual pagaria direto no balcão dos Correios — às vezes até mais barato. | Repassado ao cliente final no valor do frete, não é um custo da loja. |
| **Resend** (e-mails) | Plano grátis: 3.000 e-mails por mês, até 100/dia, 1 domínio (conferido em setembro/2026). | R$ 0 no começo. Só considerar upgrade se a loja crescer muito. |
| **Neon** (banco), **Vercel** (hospedagem), **Cloudinary** (imagens) | Já contam na estimativa de R$150-350/mês do orçamento original. | Ver `docs/etapa-a-aprovacao.md`. |

Preços de serviços de terceiros mudam sem aviso — antes de decidir algo com base neles, confirme no site oficial de cada um.

## Checklist de publicação

Consulte [`docs/GO-LIVE.md`](GO-LIVE.md) para o passo a passo ordenado de ir ao ar — este arquivo aqui é a lista solta do que falta; aquele é a ordem de execução.

## Fase 2 (depois do site no ar)

- [ ] Emissor de nota fiscal (Focus NFe, Bling ou Tiny) — precisa do CNPJ e de um contador definindo os dados fiscais.
