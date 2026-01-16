-- Migration: Chat Orders avec Stripe Payment Intent (capture différée)
-- Date: 2026-01-13
-- Description: Remplace le système escrow/wallet par Stripe Payment Intent pour les chat orders

-- 1. Ajouter les nouveaux champs Stripe à chat_orders
ALTER TABLE "chat_orders"
  ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "stripe_transfer_id" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paid_amount" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "transaction_id" TEXT UNIQUE;

-- 2. Supprimer les anciennes colonnes escrow (si elles existent)
-- Note: Ceci supprimera les données existantes. Fais un backup avant !
ALTER TABLE "chat_orders"
  DROP COLUMN IF EXISTS "escrow_transaction_id",
  DROP COLUMN IF EXISTS "release_transaction_id";

-- 3. Créer l'index pour transaction_id
CREATE INDEX IF NOT EXISTS "chat_orders_transaction_id_idx" ON "chat_orders"("transaction_id");

-- 4. Note: Les anciennes transactions CHAT_ORDER_ESCROW et CHAT_ORDER_RELEASE
-- ne seront plus utilisées. Le nouveau système utilise des Transfers Stripe directs.

COMMENT ON COLUMN "chat_orders"."stripe_payment_intent_id" IS 'Stripe Payment Intent ID (argent bloqué sur carte du PRO)';
COMMENT ON COLUMN "chat_orders"."stripe_transfer_id" IS 'Stripe Transfer ID (paiement au testeur après validation)';
COMMENT ON COLUMN "chat_orders"."paid_at" IS 'Date de capture du Payment Intent et transfer au testeur';
COMMENT ON COLUMN "chat_orders"."paid_amount" IS 'Montant net payé au testeur (après déduction des fees)';
