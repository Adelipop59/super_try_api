-- Migration: Create independent UGC table
-- Description: Transform UGC from JSON fields in Session to independent table
-- Date: 2026-01-29

-- Step 1: Create UGCStatus enum
DO $$ BEGIN
  CREATE TYPE "UGCStatus" AS ENUM ('REQUESTED', 'SUBMITTED', 'VALIDATED', 'REJECTED', 'DECLINED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create UGCType enum (if not exists)
DO $$ BEGIN
  CREATE TYPE "UGCType" AS ENUM ('VIDEO', 'PHOTO', 'TEXT_REVIEW', 'EXTERNAL_REVIEW');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 3: Create UGC table
CREATE TABLE IF NOT EXISTS "ugcs" (
  "id" TEXT NOT NULL,

  -- Type and content
  "type" "UGCType" NOT NULL,
  "content_url" TEXT,
  "description" TEXT NOT NULL,
  "comment" TEXT,

  -- Bonus
  "requested_bonus" DECIMAL(10,2),
  "paid_bonus" DECIMAL(10,2),

  -- Deadline
  "deadline" TIMESTAMP(3),

  -- Status
  "status" "UGCStatus" NOT NULL DEFAULT 'REQUESTED',

  -- Validation
  "validated_at" TIMESTAMP(3),
  "validated_by" TEXT,
  "validation_comment" TEXT,

  -- Rejection
  "rejected_at" TIMESTAMP(3),
  "rejection_reason" TEXT,

  -- Decline
  "declined_at" TIMESTAMP(3),
  "decline_reason" TEXT,

  -- Submission
  "submitted_at" TIMESTAMP(3),

  -- Relations (optional - can be linked to Session OR ChatOrder OR none)
  "session_id" TEXT,
  "chat_order_id" TEXT,

  -- Who requested/submitted
  "requested_by" TEXT NOT NULL,
  "submitted_by" TEXT,

  -- Timestamps
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ugcs_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_ugcs_session_id" ON "ugcs"("session_id");
CREATE INDEX IF NOT EXISTS "idx_ugcs_chat_order_id" ON "ugcs"("chat_order_id");
CREATE INDEX IF NOT EXISTS "idx_ugcs_status" ON "ugcs"("status");
CREATE INDEX IF NOT EXISTS "idx_ugcs_requested_by" ON "ugcs"("requested_by");
CREATE INDEX IF NOT EXISTS "idx_ugcs_submitted_by" ON "ugcs"("submitted_by");
CREATE INDEX IF NOT EXISTS "idx_ugcs_created_at" ON "ugcs"("created_at");

-- Step 5: Add foreign key constraints
ALTER TABLE "ugcs"
  ADD CONSTRAINT "ugcs_session_id_fkey"
  FOREIGN KEY ("session_id")
  REFERENCES "sessions"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "ugcs"
  ADD CONSTRAINT "ugcs_chat_order_id_fkey"
  FOREIGN KEY ("chat_order_id")
  REFERENCES "chat_orders"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "ugcs"
  ADD CONSTRAINT "ugcs_requested_by_fkey"
  FOREIGN KEY ("requested_by")
  REFERENCES "profiles"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "ugcs"
  ADD CONSTRAINT "ugcs_submitted_by_fkey"
  FOREIGN KEY ("submitted_by")
  REFERENCES "profiles"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Step 6: Add ugc_id to transactions table for UGC bonus tracking
ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "ugc_id" TEXT;

-- Add index for ugc_id
CREATE INDEX IF NOT EXISTS "idx_transactions_ugc_id" ON "transactions"("ugc_id");

-- Add foreign key constraint
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_ugc_id_fkey"
  FOREIGN KEY ("ugc_id")
  REFERENCES "ugcs"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Step 7: Comment the table
COMMENT ON TABLE "ugcs" IS 'User Generated Content - Independent table for UGC that can be linked to Sessions or ChatOrders';
COMMENT ON COLUMN "ugcs"."session_id" IS 'Optional link to a test session';
COMMENT ON COLUMN "ugcs"."chat_order_id" IS 'Optional link to a chat order';
COMMENT ON COLUMN "ugcs"."requested_by" IS 'PRO/Seller who requested the UGC';
COMMENT ON COLUMN "ugcs"."submitted_by" IS 'Tester/User who submitted the UGC';
COMMENT ON COLUMN "transactions"."ugc_id" IS 'Optional link to UGC for bonus tracking';

-- Note: After running this migration, you need to:
-- 1. Migrate existing JSON data from sessions.ugc_requests and sessions.ugc_submissions to this table
-- 2. Update the Prisma schema to include the UGC model
-- 3. Remove old UGC JSON fields from sessions table (after data migration)
-- 4. Update application code to use the new UGC table
