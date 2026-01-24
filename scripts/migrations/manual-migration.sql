-- Migration manuelle : Suppression de PRICE_VALIDATION et reset des sessions

-- 1. Supprimer la colonne validated_price de session_step_progress
ALTER TABLE "session_step_progress" DROP COLUMN IF EXISTS "validated_price";

-- 2. Supprimer tous les progress des steps PRICE_VALIDATION
DELETE FROM "session_step_progress"
WHERE "step_id" IN (
  SELECT "id" FROM "steps" WHERE "type" = 'PRICE_VALIDATION'
);

-- 3. Supprimer tous les steps de type PRICE_VALIDATION
DELETE FROM "steps" WHERE "type" = 'PRICE_VALIDATION';

-- 4. Réinitialiser toutes les sessions testeur à ACCEPTED
-- (sauf celles qui sont terminées, annulées, rejetées ou en litige)
UPDATE "sessions"
SET
  "status" = 'ACCEPTED',
  "validated_product_price" = NULL,
  "price_validated_at" = NULL,
  "purchase_proof_url" = NULL,
  "purchased_at" = NULL,
  "order_number" = NULL,
  "order_number_validated_at" = NULL,
  "submitted_at" = NULL,
  "submission_data" = NULL
WHERE "status" NOT IN ('COMPLETED', 'CANCELLED', 'REJECTED', 'DISPUTED', 'PENDING');

-- 5. Supprimer tous les progress de toutes les sessions actives
DELETE FROM "session_step_progress"
WHERE "session_id" IN (
  SELECT "id" FROM "sessions"
  WHERE "status" = 'ACCEPTED'
);

-- Afficher le résumé
SELECT
  'Sessions réinitialisées' as action,
  COUNT(*) as count
FROM "sessions"
WHERE "status" = 'ACCEPTED';
