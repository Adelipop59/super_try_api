-- Migration: ChatOrders System (Prestations Supplémentaires avec Escrow)
-- Date: 2025-12-09

BEGIN;

-- Enums ChatOrderType et ChatOrderStatus
DO $$ BEGIN
    CREATE TYPE "ChatOrderType" AS ENUM ('UGC_REQUEST', 'PHOTO_REQUEST', 'TIP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ChatOrderStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DELIVERED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'DISPUTED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Extension TransactionType
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'CHAT_ORDER_ESCROW';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'CHAT_ORDER_RELEASE';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'CHAT_ORDER_REFUND';

-- Extension TransactionStatus
ALTER TYPE "TransactionStatus" ADD VALUE IF NOT EXISTS 'ESCROW';

-- Extension Wallet : pendingBalance
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "pending_balance" DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Table ChatOrder
CREATE TABLE IF NOT EXISTS "chat_orders" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "type" "ChatOrderType" NOT NULL,
    "status" "ChatOrderStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "delivery_deadline" TIMESTAMP(3),
    "delivery_proof" JSONB,
    "escrow_transaction_id" TEXT,
    "release_transaction_id" TEXT,
    "delivered_at" TIMESTAMP(3),
    "validated_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "disputed_at" TIMESTAMP(3),
    "dispute_reason" TEXT,
    "dispute_resolved_at" TIMESTAMP(3),
    "dispute_resolution" TEXT,
    "dispute_resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_orders_pkey" PRIMARY KEY ("id")
);

-- Indexes ChatOrder
CREATE INDEX IF NOT EXISTS "chat_orders_session_id_idx" ON "chat_orders"("session_id");
CREATE INDEX IF NOT EXISTS "chat_orders_buyer_id_idx" ON "chat_orders"("buyer_id");
CREATE INDEX IF NOT EXISTS "chat_orders_seller_id_idx" ON "chat_orders"("seller_id");
CREATE INDEX IF NOT EXISTS "chat_orders_status_idx" ON "chat_orders"("status");
CREATE INDEX IF NOT EXISTS "chat_orders_type_idx" ON "chat_orders"("type");

-- Foreign Keys ChatOrder
ALTER TABLE "chat_orders" ADD CONSTRAINT "chat_orders_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_orders" ADD CONSTRAINT "chat_orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_orders" ADD CONSTRAINT "chat_orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_orders" ADD CONSTRAINT "chat_orders_escrow_transaction_id_fkey" FOREIGN KEY ("escrow_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "chat_orders" ADD CONSTRAINT "chat_orders_release_transaction_id_fkey" FOREIGN KEY ("release_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Extension Transactions : chatOrderId
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "chat_order_id" TEXT;
CREATE INDEX IF NOT EXISTS "transactions_chat_order_id_idx" ON "transactions"("chat_order_id");
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_chat_order_id_fkey" FOREIGN KEY ("chat_order_id") REFERENCES "chat_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
