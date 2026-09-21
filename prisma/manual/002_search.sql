-- Busca sem acento e tolerante a erro de digitação: npm run db:search  (pode repetir sem erro)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
