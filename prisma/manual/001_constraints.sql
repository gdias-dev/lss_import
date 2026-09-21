-- Rode depois da primeira migração: npm run db:constraints  (pode repetir sem erro)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_non_negative') THEN
    ALTER TABLE "ProductVariant" ADD CONSTRAINT "stock_non_negative" CHECK ("stockQty" >= 0);
  END IF;
END $$;

-- Um endereço padrão por cliente (garantia extra além da regra no código).
CREATE UNIQUE INDEX IF NOT EXISTS "address_one_default_per_user" ON "Address" ("userId") WHERE "isDefault";
