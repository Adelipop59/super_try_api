-- Migration Complète: Messaging Enhancements + ChatOrders + KYC
-- Date: 2025-12-09
-- Description: Migration consolidée pour la messagerie, les commandes de prestations et le KYC Stripe

BEGIN;

-- ==========================================
-- PARTIE 1: MESSAGING ENHANCEMENTS
-- ==========================================

-- Sessions : dispute + admin tracking
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "dispute_declared_by" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "is_conversation_locked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "admin_joined_at" TIMESTAMP(3);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "admin_invited_by" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "admin_invited_at" TIMESTAMP(3);

-- Messages : read receipts + types
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "read_by" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "message_type" TEXT DEFAULT 'TEXT';
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "is_system_message" BOOLEAN NOT NULL DEFAULT false;

-- Indexes for Sessions
CREATE INDEX IF NOT EXISTS "sessions_is_conversation_locked_idx" ON "sessions"("is_conversation_locked");

-- Indexes for Messages
CREATE INDEX IF NOT EXISTS "messages_message_type_idx" ON "messages"("message_type");
CREATE INDEX IF NOT EXISTS "messages_is_system_message_idx" ON "messages"("is_system_message");

-- ==========================================
-- PARTIE 2: CHAT ORDERS (Prestations)
-- ==========================================

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
DO $$ BEGIN
    ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'CHAT_ORDER_ESCROW';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'CHAT_ORDER_RELEASE';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'CHAT_ORDER_REFUND';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Extension TransactionStatus
DO $$ BEGIN
    ALTER TYPE "TransactionStatus" ADD VALUE IF NOT EXISTS 'ESCROW';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
DO $$ BEGIN
    ALTER TABLE "chat_orders" ADD CONSTRAINT "chat_orders_session_id_fkey"
        FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "chat_orders" ADD CONSTRAINT "chat_orders_buyer_id_fkey"
        FOREIGN KEY ("buyer_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "chat_orders" ADD CONSTRAINT "chat_orders_seller_id_fkey"
        FOREIGN KEY ("seller_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "chat_orders" ADD CONSTRAINT "chat_orders_escrow_transaction_id_fkey"
        FOREIGN KEY ("escrow_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "chat_orders" ADD CONSTRAINT "chat_orders_release_transaction_id_fkey"
        FOREIGN KEY ("release_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Extension Transactions : chatOrderId
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "chat_order_id" TEXT;
CREATE INDEX IF NOT EXISTS "transactions_chat_order_id_idx" ON "transactions"("chat_order_id");

DO $$ BEGIN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_chat_order_id_fkey"
        FOREIGN KEY ("chat_order_id") REFERENCES "chat_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- PARTIE 3: KYC STRIPE IDENTITY
-- ==========================================

-- Profile : KYC Stripe Identity
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "stripe_verification_session_id" TEXT UNIQUE;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "verification_status" TEXT DEFAULT 'unverified';
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3);
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "verification_failed_reason" TEXT;

-- Index verification_status
CREATE INDEX IF NOT EXISTS "profiles_verification_status_idx" ON "profiles"("verification_status");

COMMIT;

-- Migration terminée avec succès
