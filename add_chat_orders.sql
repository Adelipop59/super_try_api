-- Migration: add_chat_orders
-- Description: Ajout du système de prestations supplémentaires (ChatOrders) avec escrow

-- 1. Créer les nouveaux enums
CREATE TYPE "ChatOrderType" AS ENUM ('UGC_REQUEST', 'PHOTO_REQUEST', 'TIP');
CREATE TYPE "ChatOrderStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DELIVERED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'DISPUTED', 'REFUNDED');

-- 2. Étendre TransactionType avec nouveaux types escrow
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'CHAT_ORDER_ESCROW';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'CHAT_ORDER_RELEASE';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'CHAT_ORDER_REFUND';

-- 3. Étendre TransactionStatus avec ESCROW
ALTER TYPE "TransactionStatus" ADD VALUE IF NOT EXISTS 'ESCROW';

-- 4. Ajouter pendingBalance au wallet
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "pending_balance" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- 5. Créer la table chat_orders
CREATE TABLE IF NOT EXISTS "chat_orders" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Relations
  "session_id" TEXT NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "buyer_id" TEXT NOT NULL REFERENCES "profiles"("id") ON DELETE RESTRICT,
  "seller_id" TEXT NOT NULL REFERENCES "profiles"("id") ON DELETE RESTRICT,

  -- Order details
  "type" "ChatOrderType" NOT NULL,
  "status" "ChatOrderStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(10,2) NOT NULL,
  "description" TEXT NOT NULL,

  -- Delivery
  "delivery_deadline" TIMESTAMP(3),
  "delivery_proof" JSONB,
  "delivered_at" TIMESTAMP(3),

  -- Validation
  "validated_at" TIMESTAMP(3),
  "validated_by" TEXT,

  -- Rejection
  "rejected_at" TIMESTAMP(3),
  "rejection_reason" TEXT,

  -- Cancellation
  "cancelled_at" TIMESTAMP(3),

  -- Dispute
  "disputed_at" TIMESTAMP(3),
  "dispute_reason" TEXT,
  "dispute_resolved_at" TIMESTAMP(3),
  "dispute_resolution" TEXT,
  "dispute_resolved_by" TEXT,

  -- Payment tracking (escrow)
  "escrow_transaction_id" TEXT UNIQUE REFERENCES "transactions"("id"),
  "release_transaction_id" TEXT UNIQUE REFERENCES "transactions"("id"),

  -- Metadata
  "metadata" JSONB,

  -- Timestamps
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Créer les index sur chat_orders
CREATE INDEX IF NOT EXISTS "chat_orders_session_id_idx" ON "chat_orders"("session_id");
CREATE INDEX IF NOT EXISTS "chat_orders_buyer_id_idx" ON "chat_orders"("buyer_id");
CREATE INDEX IF NOT EXISTS "chat_orders_seller_id_idx" ON "chat_orders"("seller_id");
CREATE INDEX IF NOT EXISTS "chat_orders_type_idx" ON "chat_orders"("type");
CREATE INDEX IF NOT EXISTS "chat_orders_status_idx" ON "chat_orders"("status");
CREATE INDEX IF NOT EXISTS "chat_orders_created_at_idx" ON "chat_orders"("created_at");

-- 7. Ajouter chat_order_id à la table transactions
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "chat_order_id" TEXT REFERENCES "chat_orders"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "transactions_chat_order_id_idx" ON "transactions"("chat_order_id");

-- 8. Créer trigger pour updated_at sur chat_orders
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_orders_updated_at BEFORE UPDATE ON "chat_orders"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fin de la migration
