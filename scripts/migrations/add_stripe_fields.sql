-- Migration: Add Stripe Customer ID and Account ID to profiles table
-- Date: 2025-12-05
-- Purpose: Enable storage of Stripe IDs for payment integration

-- Add stripe_customer_id column (for all users - payment methods)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add stripe_account_id column (for PRO users - connected accounts for payouts)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- Create unique partial index for stripe_customer_id (only where NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_key
ON profiles(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Create unique partial index for stripe_account_id (only where NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_account_id_key
ON profiles(stripe_account_id)
WHERE stripe_account_id IS NOT NULL;

-- Verify columns were added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('stripe_customer_id', 'stripe_account_id')
ORDER BY column_name;

-- Verify indexes were created
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'profiles'
AND indexname LIKE '%stripe%'
ORDER BY indexname;
