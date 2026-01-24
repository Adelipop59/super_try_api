-- Migration: Add price validation attempts and product title fallback
-- Date: 2026-01-24
-- Description: Ajoute le système de tentatives de validation du prix et le fallback sur le titre du produit

BEGIN;

-- Ajouter les colonnes pour le tracking des tentatives de validation du prix
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "price_validation_attempts" INTEGER DEFAULT 0;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "product_title_submitted" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "product_title_submitted_at" TIMESTAMP;

-- Index pour recherche des sessions avec titre soumis (pour monitoring et debug vendeur)
CREATE INDEX IF NOT EXISTS "sessions_product_title_idx"
  ON "sessions" ("product_title_submitted")
  WHERE "product_title_submitted" IS NOT NULL;

-- Commentaires pour documentation
COMMENT ON COLUMN "sessions"."price_validation_attempts" IS 'Nombre de tentatives de validation du prix (max 2 avant fallback sur titre du produit)';
COMMENT ON COLUMN "sessions"."product_title_submitted" IS 'Titre du produit soumis par le testeur après 2 échecs de validation du prix';
COMMENT ON COLUMN "sessions"."product_title_submitted_at" IS 'Date et heure de soumission du titre du produit par le testeur';

COMMIT;
