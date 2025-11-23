-- Migration: add_seller_payments
-- Description: Add support for seller campaign payments in transactions table

-- =============================================
-- 1. Add new enum values to TransactionType
-- =============================================

-- Add CAMPAIGN_PAYMENT type
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'CAMPAIGN_PAYMENT';

-- Add CAMPAIGN_REFUND type
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'CAMPAIGN_REFUND';

-- =============================================
-- 2. Modify transactions table
-- =============================================

-- Make wallet_id optional (null for seller payments)
ALTER TABLE "transactions" ALTER COLUMN "wallet_id" DROP NOT NULL;

-- Add campaign_id column (TEXT to match campaigns.id type from Prisma String)
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "campaign_id" TEXT;

-- Add stripe_payment_intent_id column
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" VARCHAR(255);

-- =============================================
-- 3. Add indexes and constraints
-- =============================================

-- Index on campaign_id for faster lookups
CREATE INDEX IF NOT EXISTS "transactions_campaign_id_idx" ON "transactions"("campaign_id");

-- Unique constraint on stripe_payment_intent_id
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_stripe_payment_intent_id_key" ON "transactions"("stripe_payment_intent_id");

-- Foreign key constraint to campaigns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transactions_campaign_id_fkey'
  ) THEN
    ALTER TABLE "transactions"
    ADD CONSTRAINT "transactions_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

