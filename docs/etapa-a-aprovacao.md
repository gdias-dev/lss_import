# Etapa A — Aprovação (LS Imports)

Etapa A **aprovada**. Próximo passo: Etapa 1. Tudo que estiver como "padrão" é **configurável** (painel ou variável de ambiente) e pode ser trocado depois sem refazer código.

## 1. Resumo do projeto

Loja virtual própria para a LS Imports (perfumes de várias marcas, Instagram @lss.import). Visual preto e dourado, luxuoso e confiável. Vende para o Brasil todo, com entrega própria e pagamento na entrega só em zonas locais. Conta obrigatória para comprar. Catálogo com variações (tamanho) com preço e estoque próprios. Checkout com Pix, cartão de crédito parcelado, débito (se o gateway suportar) e pagamento na entrega. Frete dos Correios (Melhor Envio) e entrega própria por zonas. Pedido pronto no WhatsApp da loja. Painel admin com importação CSV. Fase 2: avaliações, relatórios e nota fiscal. Fora do escopo: blog, Sobre, FAQ, feed do Instagram, pixels, fidelidade.

## 2. Pendências e valores padrão propostos

| # | Pendência | Padrão proposto para desenvolver | Onde configura |
|---|---|---|---|
| 1 | CNPJ, regime e contador | Sem padrão. Só bloqueia nota fiscal (Fase 2) e o gateway em produção. Desenvolvimento segue em sandbox. | Setting `cnpj` |
| 2 | Gateway | Implementar primeiro **Mercado Pago** (sandbox) atrás da interface `PaymentProvider`. Trocar depois é criar outra implementação. Débito desligado. | `PAYMENT_PROVIDER`, Setting `debitEnabled` |
| 3 | CEP de origem | Vazio. Sem ele, o frete usa a tabela fixa de contingência. | `STORE_ORIGIN_CEP` |
| 4 | Zonas de entrega própria | Uma zona de exemplo, **inativa**, no seed. O dono cria as reais no painel. | Admin > Entrega |
| 5 | Frete grátis mínimo | **Desligado** (valor 0). O dono liga e define o valor. | Setting `freeShippingAboveCents` |
| 6 | Parcelamento | Até **3x sem juros**, parcela mínima **R$ 30,00**, taxa de juros mensal **0%** (não cobra juros), desconto Pix **0%**. Valores provisórios, decisão do cliente. | Settings |
| 7 | WhatsApp da loja | Vazio. Sem número, os botões de WhatsApp ficam ocultos. | `WHATSAPP_NUMBER` |
| 8 | Logo e cores | Tokens de referência `#0B0B0C`, `#C9A45C`, `#F3EDE2` num único arquivo de tema, fáceis de trocar. | `src/styles/tokens` |
| 9 | Domínio e e-mail | Desenvolvimento no domínio da Vercel. E-mail de teste do Resend até haver domínio próprio. | `EMAIL_FROM` |
| 10 | Páginas legais | Texto-modelo marcado **"rascunho, revisar"**. O texto final deve ser validado por contador ou advogado. | Arquivos do repositório |
| 11 | Peso e medidas por frasco | Padrão por tamanho: até 50 ml = 300 g e 12x8x8 cm; 100 ml = 500 g e 16x10x10 cm; acima de 100 ml = 800 g e 18x12x12 cm. Editável por variação. Conferir mínimos do Correios e do Melhor Envio. | Cadastro da variação |
| 12 | Quantidade de produtos | Seed com 12 produtos fictícios para testar. Importação CSV para o cadastro real. | Admin > Produtos |
| 13 | Retirada na loja | Não solicitada. O modelo já prevê `PICKUP`, desativado por padrão. | Setting `pickupEnabled` |
| 14 | Regras de envio de perfume | Verificar na Etapa 7 as regras do Melhor Envio e dos Correios para líquidos com álcool. | — |

## 3. Decisões aprovadas

1. **CPF:** pedido no **checkout**, não no cadastro. Continua obrigatório para pagar e para a nota fiscal.
2. **Avaliações:** o cliente só avalia depois que o admin marca o pedido como **ENTREGUE**. Sem liberação automática por prazo. Risco: se ninguém marcar como entregue, não haverá avaliações. Revisitar se isso acontecer.
3. **Gateway:** **Mercado Pago** primeiro (sandbox), atrás da interface `PaymentProvider`.

## 4. Inconsistências e pontos de atenção do briefing

- **Débito online:** o briefing lista débito no checkout, mas nem todo gateway suporta. Por isso fica atrás de configuração.
- **Reserva de estoque:** vale só para Pix (30 min, configurável). Cartão é síncrono, pagamento na entrega baixa o estoque na criação do pedido.
- **Numeração:** o número do pedido é sequencial (`LS-000123` na tela, inteiro no banco).
- **Cupom:** um por pedido, validado no carrinho e de novo ao criar o pedido.
- **Prisma:** o schema usa sintaxe validada, mas a versão da biblioteca será fixada e conferida na documentação atual na Etapa 1.

## 5. Estrutura de pastas proposta

```
lss_import/
  CLAUDE.md  README.md  .gitignore  .env.example
  docs/                 briefing.pdf, etapa-a-aprovacao.md
  prisma/               schema.prisma, migrations/, seed.ts
  public/
  src/
    app/
      (loja)/           home, perfumes, [categoria], marca/[slug], produto/[slug], busca
      (loja)/           carrinho, checkout, pedido/[id]/confirmado
      (conta)/conta/    dados, enderecos, pedidos, pedidos/[id]
      (auth)/           entrar, cadastrar, recuperar-senha, verificar-email
      (legal)/          privacidade, termos, trocas-e-devolucoes
      admin/            dashboard, produtos, pedidos, clientes, cupons,
                        entrega, banners, avaliacoes, relatorios, config
      api/              webhooks/[provider], cron/expirar-pix, cron/limpar-carrinhos
    server/
      catalog/ cart/ coupons/ checkout/ orders/ shipping/
      whatsapp/ emails/ reports/ invoices/
      payments/         provider.ts (interface), providers/mercadopago.ts
    lib/                prisma.ts, money.ts, cep.ts, auth.ts, settings.ts, validators/
    components/         ui/, loja/, admin/
    styles/             tokens, globals
  tests/                unit/, e2e/
```

## 6. Modelo de dados

O schema completo está em `prisma/schema.prisma` (23 modelos). Destaques:

- Valores em **centavos** (`Int`). Pedido e itens guardam **snapshot** de nome, preço e endereço.
- `WebhookEvent` com `@@unique([provider, eventId])` garante **idempotência** dos webhooks.
- `Payment.idempotencyKey` único evita cobrança duplicada.
- `EmailToken` guarda só o **hash** do token de verificação e de recuperação de senha.
- `DeliveryZone` e `DeliveryZoneRange` cobrem entrega própria por faixa de CEP e por bairro.
- `StockMovement` registra toda mudança de estoque, e `AuditLog` registra alterações do admin.
- Ajustes que o Prisma não expressa (CHECK de estoque não negativo e busca trigram) estão descritos no topo do schema, para virar migração SQL manual.
