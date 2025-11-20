-- ==================================================================================
-- FIX MISSING TABLES AND NULL VALUES
-- ==================================================================================
-- This migration creates all missing tables and fixes null values in required columns
-- Execute this script via Supabase Studio (SQL Editor)
-- ==================================================================================

-- 1. Create missing enums if they don't exist
DO $$
BEGIN
    -- TransactionType
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionType') THEN
        CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');
    END IF;

    -- TransactionStatus
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionStatus') THEN
        CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
    END IF;

    -- WithdrawalMethod
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WithdrawalMethod') THEN
        CREATE TYPE "WithdrawalMethod" AS ENUM ('BANK_TRANSFER', 'GIFT_CARD');
    END IF;

    -- WithdrawalStatus
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WithdrawalStatus') THEN
        CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
    END IF;

    -- Add PENDING_PAYMENT to CampaignStatus if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'CampaignStatus'::regtype
        AND enumlabel = 'PENDING_PAYMENT'
    ) THEN
        ALTER TYPE "CampaignStatus" ADD VALUE 'PENDING_PAYMENT';
    END IF;

    -- Add PRICE_VALIDATION to StepType if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'StepType'::regtype
        AND enumlabel = 'PRICE_VALIDATION'
    ) THEN
        ALTER TYPE "StepType" ADD VALUE 'PRICE_VALIDATION';
    END IF;
END $$;

-- 2. Create categories table
CREATE TABLE IF NOT EXISTS "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints to categories
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_name_key') THEN
        ALTER TABLE "categories" ADD CONSTRAINT "categories_name_key" UNIQUE ("name");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_slug_key') THEN
        ALTER TABLE "categories" ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");
    END IF;
END $$;

-- Create indexes for categories
CREATE INDEX IF NOT EXISTS "categories_slug_idx" ON "categories"("slug");
CREATE INDEX IF NOT EXISTS "categories_is_active_idx" ON "categories"("is_active");

-- 3. Add category_id to products if using new category system
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='products' AND column_name='category_id'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "category_id" TEXT;
    END IF;
END $$;

-- Add foreign key for products.category_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_fkey') THEN
        ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey"
        FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "products_category_id_idx" ON "products"("category_id");

-- 4. Create wallets table
CREATE TABLE IF NOT EXISTS "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "total_earned" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_withdrawn" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "last_credited_at" TIMESTAMP(3),
    "last_withdrawn_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint for wallets
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_user_id_key') THEN
        ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_key" UNIQUE ("user_id");
    END IF;
END $$;

-- Create indexes for wallets
CREATE INDEX IF NOT EXISTS "wallets_user_id_idx" ON "wallets"("user_id");
CREATE INDEX IF NOT EXISTS "wallets_balance_idx" ON "wallets"("balance");

-- Add foreign key for wallets
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_user_id_fkey') THEN
        ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 5. Create withdrawals table
CREATE TABLE IF NOT EXISTS "withdrawals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "WithdrawalMethod" NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "payment_details" JSONB,
    "processed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "processed_by" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- Create indexes for withdrawals
CREATE INDEX IF NOT EXISTS "withdrawals_user_id_idx" ON "withdrawals"("user_id");
CREATE INDEX IF NOT EXISTS "withdrawals_status_idx" ON "withdrawals"("status");
CREATE INDEX IF NOT EXISTS "withdrawals_method_idx" ON "withdrawals"("method");
CREATE INDEX IF NOT EXISTS "withdrawals_created_at_idx" ON "withdrawals"("created_at");

-- Add foreign key for withdrawals
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'withdrawals_user_id_fkey') THEN
        ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 6. Create transactions table
CREATE TABLE IF NOT EXISTS "transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "session_id" TEXT,
    "bonus_task_id" TEXT,
    "withdrawal_id" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "failure_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- Create indexes for transactions
CREATE INDEX IF NOT EXISTS "transactions_wallet_id_idx" ON "transactions"("wallet_id");
CREATE INDEX IF NOT EXISTS "transactions_session_id_idx" ON "transactions"("session_id");
CREATE INDEX IF NOT EXISTS "transactions_bonus_task_id_idx" ON "transactions"("bonus_task_id");
CREATE INDEX IF NOT EXISTS "transactions_withdrawal_id_idx" ON "transactions"("withdrawal_id");
CREATE INDEX IF NOT EXISTS "transactions_type_idx" ON "transactions"("type");
CREATE INDEX IF NOT EXISTS "transactions_status_idx" ON "transactions"("status");
CREATE INDEX IF NOT EXISTS "transactions_created_at_idx" ON "transactions"("created_at");

-- Add foreign keys for transactions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_wallet_id_fkey') THEN
        ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey"
        FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_session_id_fkey') THEN
        ALTER TABLE "transactions" ADD CONSTRAINT "transactions_session_id_fkey"
        FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_bonus_task_id_fkey') THEN
        ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bonus_task_id_fkey"
        FOREIGN KEY ("bonus_task_id") REFERENCES "bonus_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_withdrawal_id_fkey') THEN
        ALTER TABLE "transactions" ADD CONSTRAINT "transactions_withdrawal_id_fkey"
        FOREIGN KEY ("withdrawal_id") REFERENCES "withdrawals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 7. Create session_step_progress table
CREATE TABLE IF NOT EXISTS "session_step_progress" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "submission_data" JSONB,
    "validated_price" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_step_progress_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint for session_step_progress
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_step_progress_session_id_step_id_key') THEN
        ALTER TABLE "session_step_progress" ADD CONSTRAINT "session_step_progress_session_id_step_id_key" UNIQUE ("session_id", "step_id");
    END IF;
END $$;

-- Create indexes for session_step_progress
CREATE INDEX IF NOT EXISTS "session_step_progress_session_id_idx" ON "session_step_progress"("session_id");
CREATE INDEX IF NOT EXISTS "session_step_progress_step_id_idx" ON "session_step_progress"("step_id");
CREATE INDEX IF NOT EXISTS "session_step_progress_is_completed_idx" ON "session_step_progress"("is_completed");

-- Add foreign keys for session_step_progress
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_step_progress_session_id_fkey') THEN
        ALTER TABLE "session_step_progress" ADD CONSTRAINT "session_step_progress_session_id_fkey"
        FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_step_progress_step_id_fkey') THEN
        ALTER TABLE "session_step_progress" ADD CONSTRAINT "session_step_progress_step_id_fkey"
        FOREIGN KEY ("step_id") REFERENCES "steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 8. Create campaign_criteria table
CREATE TABLE IF NOT EXISTS "campaign_criteria" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "min_age" INTEGER,
    "max_age" INTEGER,
    "min_rating" DECIMAL(3,2),
    "max_rating" DECIMAL(3,2),
    "min_completed_sessions" INTEGER,
    "required_gender" TEXT,
    "required_locations" TEXT[] DEFAULT '{}',
    "required_categories" TEXT[] DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_criteria_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint for campaign_criteria
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaign_criteria_campaign_id_key') THEN
        ALTER TABLE "campaign_criteria" ADD CONSTRAINT "campaign_criteria_campaign_id_key" UNIQUE ("campaign_id");
    END IF;
END $$;

-- Create index for campaign_criteria
CREATE INDEX IF NOT EXISTS "campaign_criteria_campaign_id_idx" ON "campaign_criteria"("campaign_id");

-- Add foreign key for campaign_criteria
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaign_criteria_campaign_id_fkey') THEN
        ALTER TABLE "campaign_criteria" ADD CONSTRAINT "campaign_criteria_campaign_id_fkey"
        FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 9. Add missing tester columns to profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='birth_date') THEN
        ALTER TABLE "profiles" ADD COLUMN "birth_date" TIMESTAMP(3);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='gender') THEN
        ALTER TABLE "profiles" ADD COLUMN "gender" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='location') THEN
        ALTER TABLE "profiles" ADD COLUMN "location" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='average_rating') THEN
        ALTER TABLE "profiles" ADD COLUMN "average_rating" DECIMAL(3,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='completed_sessions_count') THEN
        ALTER TABLE "profiles" ADD COLUMN "completed_sessions_count" INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='preferred_categories') THEN
        ALTER TABLE "profiles" ADD COLUMN "preferred_categories" TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- 10. Fix offers table - Add missing columns and fix null values
DO $$
BEGIN
    -- Add expected_price column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='offers' AND column_name='expected_price') THEN
        ALTER TABLE "offers" ADD COLUMN "expected_price" DECIMAL(10,2);
    END IF;

    -- Add price_range_min column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='offers' AND column_name='price_range_min') THEN
        ALTER TABLE "offers" ADD COLUMN "price_range_min" DECIMAL(10,2);
    END IF;

    -- Add price_range_max column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='offers' AND column_name='price_range_max') THEN
        ALTER TABLE "offers" ADD COLUMN "price_range_max" DECIMAL(10,2);
    END IF;

    -- Add is_price_revealed column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='offers' AND column_name='is_price_revealed') THEN
        ALTER TABLE "offers" ADD COLUMN "is_price_revealed" BOOLEAN DEFAULT false;
    END IF;

    -- Add shipping_cost column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='offers' AND column_name='shipping_cost') THEN
        ALTER TABLE "offers" ADD COLUMN "shipping_cost" DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- 11. Fix null values in offers table
-- Set default values for any null expected_price values
UPDATE "offers" SET "expected_price" = COALESCE(
    (SELECT p."price" FROM "products" p WHERE p."id" = "offers"."product_id"),
    0
) WHERE "expected_price" IS NULL;

-- Set default values for any null price_range_min values (10% below expected price)
UPDATE "offers" SET "price_range_min" = COALESCE("expected_price" * 0.9, 0) WHERE "price_range_min" IS NULL;

-- Set default values for any null price_range_max values (10% above expected price)
UPDATE "offers" SET "price_range_max" = COALESCE("expected_price" * 1.1, 0) WHERE "price_range_max" IS NULL;

-- Set default for shipping_cost if null
UPDATE "offers" SET "shipping_cost" = 0 WHERE "shipping_cost" IS NULL;

-- Set default for bonus if null
UPDATE "offers" SET "bonus" = 0 WHERE "bonus" IS NULL;

-- 12. Make required columns NOT NULL after setting defaults
ALTER TABLE "offers" ALTER COLUMN "expected_price" SET NOT NULL;
ALTER TABLE "offers" ALTER COLUMN "price_range_min" SET NOT NULL;
ALTER TABLE "offers" ALTER COLUMN "price_range_max" SET NOT NULL;
ALTER TABLE "offers" ALTER COLUMN "shipping_cost" SET NOT NULL;
ALTER TABLE "offers" ALTER COLUMN "shipping_cost" SET DEFAULT 0;

-- ==================================================================================
-- VERIFICATION
-- ==================================================================================
SELECT 'Migration completed successfully!' as status;

-- List all created tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('wallets', 'transactions', 'withdrawals', 'session_step_progress', 'campaign_criteria', 'categories')
ORDER BY table_name;
