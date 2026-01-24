-- Migration: Add keywords field to campaigns table
-- Date: 2026-01-23

BEGIN;

-- Add keywords column as array of text with default empty array
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "keywords" TEXT[] DEFAULT '{}';

-- Add index for better search performance on keywords
CREATE INDEX IF NOT EXISTS "campaigns_keywords_idx" ON "campaigns" USING GIN ("keywords");

COMMIT;
