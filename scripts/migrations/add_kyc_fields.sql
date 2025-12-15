-- Migration: KYC Stripe Identity Fields
-- Date: 2025-12-09

BEGIN;

-- Profile : KYC Stripe Identity
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "stripe_verification_session_id" TEXT UNIQUE;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "verification_status" TEXT DEFAULT 'unverified';
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3);
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "verification_failed_reason" TEXT;

-- Index verification_status
CREATE INDEX IF NOT EXISTS "profiles_verification_status_idx" ON "profiles"("verification_status");

COMMIT;
