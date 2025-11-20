-- ==================================================================================
-- FIX REMAINING TABLES - withdrawals and transactions
-- ==================================================================================

-- 1. Create missing enums with proper casing
DO $$
BEGIN
    -- TransactionType
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transactiontype') THEN
        CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');
    END IF;

    -- TransactionStatus
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transactionstatus') THEN
        CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
    END IF;

    -- WithdrawalMethod
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawalmethod') THEN
        CREATE TYPE "WithdrawalMethod" AS ENUM ('BANK_TRANSFER', 'GIFT_CARD');
    END IF;

    -- WithdrawalStatus
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawalstatus') THEN
        CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
    END IF;
END $$;

-- 2. Create withdrawals table
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

-- 3. Create transactions table
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

-- ==================================================================================
-- VERIFICATION
-- ==================================================================================
SELECT 'Migration completed successfully!' as status;

-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('wallets', 'transactions', 'withdrawals')
ORDER BY table_name;
