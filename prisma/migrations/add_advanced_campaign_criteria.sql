-- Migration: add_advanced_campaign_criteria
-- Description: Add new fields to Profile and CampaignCriteria for advanced eligibility criteria

-- =============================================
-- 1. Add new columns to profiles table
-- =============================================

-- Performance statistics
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "cancelled_sessions_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "total_sessions_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "last_active_at" TIMESTAMP(3);

-- Premium status
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "is_prime" BOOLEAN NOT NULL DEFAULT false;

-- =============================================
-- 2. Add new columns to campaign_criteria table
-- =============================================

-- Location criteria (excluded)
ALTER TABLE "campaign_criteria" ADD COLUMN IF NOT EXISTS "excluded_locations" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Anti-duplicate seller criteria
ALTER TABLE "campaign_criteria" ADD COLUMN IF NOT EXISTS "no_active_session_with_seller" BOOLEAN NOT NULL DEFAULT false;

-- Participation limits
ALTER TABLE "campaign_criteria" ADD COLUMN IF NOT EXISTS "max_sessions_per_week" INTEGER;
ALTER TABLE "campaign_criteria" ADD COLUMN IF NOT EXISTS "max_sessions_per_month" INTEGER;

-- Quality criteria
ALTER TABLE "campaign_criteria" ADD COLUMN IF NOT EXISTS "min_completion_rate" DECIMAL(5,2);
ALTER TABLE "campaign_criteria" ADD COLUMN IF NOT EXISTS "max_cancellation_rate" DECIMAL(5,2);

-- Temporal criteria
ALTER TABLE "campaign_criteria" ADD COLUMN IF NOT EXISTS "min_account_age" INTEGER;
ALTER TABLE "campaign_criteria" ADD COLUMN IF NOT EXISTS "last_active_within_days" INTEGER;

-- Verification criteria
ALTER TABLE "campaign_criteria" ADD COLUMN IF NOT EXISTS "require_verified" BOOLEAN NOT NULL DEFAULT false;

-- Premium criteria
ALTER TABLE "campaign_criteria" ADD COLUMN IF NOT EXISTS "require_prime" BOOLEAN NOT NULL DEFAULT false;

-- =============================================
-- 3. Drop old columns from products table (if they exist)
-- =============================================

-- These columns were replaced by category relation
ALTER TABLE "products" DROP COLUMN IF EXISTS "category";
ALTER TABLE "products" DROP COLUMN IF EXISTS "stock";
