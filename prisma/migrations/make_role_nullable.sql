-- Migration: Make role column nullable
-- This allows OAuth users to register without a default role
-- and choose their role during onboarding

BEGIN;

-- Remove default value
ALTER TABLE "profiles" ALTER COLUMN "role" DROP DEFAULT;

-- Make column nullable
ALTER TABLE "profiles" ALTER COLUMN "role" DROP NOT NULL;

COMMIT;
