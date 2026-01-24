-- Migration: Add product name to offers
-- Date: 2026-01-23

BEGIN;

-- Add product_name column (nullable first for migration)
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "product_name" TEXT;

-- Remplir avec les noms des produits existants (migration de données)
UPDATE "offers" o
SET "product_name" = p.name
FROM "products" p
WHERE o.product_id = p.id
  AND o.product_name IS NULL;

-- Rendre obligatoire après migration
ALTER TABLE "offers" ALTER COLUMN "product_name" SET NOT NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN "offers"."product_name" IS 'Nom exact du produit à chercher tel qu''il apparaît sur la marketplace (Amazon, etc.)';

COMMIT;
