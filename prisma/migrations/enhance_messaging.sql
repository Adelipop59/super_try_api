-- Migration: Enhanced Messaging System
-- Description: Add admin participation, dispute tracking, message types, and read receipts

-- ============================================
-- SESSIONS TABLE: Add dispute and admin fields
-- ============================================

-- Dispute tracking enhancements
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "dispute_declared_by" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "is_conversation_locked" BOOLEAN NOT NULL DEFAULT false;

-- Admin participation tracking
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "admin_joined_at" TIMESTAMP(3);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "admin_invited_by" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "admin_invited_at" TIMESTAMP(3);

-- Index for conversation lock filtering
CREATE INDEX IF NOT EXISTS "sessions_is_conversation_locked_idx" ON "sessions"("is_conversation_locked");

-- ============================================
-- MESSAGES TABLE: Add read receipts and message types
-- ============================================

-- Read receipt tracking
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "read_by" TEXT;

-- Message type tracking
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "message_type" TEXT DEFAULT 'TEXT';
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "is_system_message" BOOLEAN NOT NULL DEFAULT false;

-- Indexes for message filtering
CREATE INDEX IF NOT EXISTS "messages_message_type_idx" ON "messages"("message_type");
CREATE INDEX IF NOT EXISTS "messages_is_system_message_idx" ON "messages"("is_system_message");

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN "sessions"."dispute_declared_by" IS 'Profile ID of user who declared the dispute (PRO or USER)';
COMMENT ON COLUMN "sessions"."is_conversation_locked" IS 'When true, only ADMIN can send messages';
COMMENT ON COLUMN "sessions"."admin_joined_at" IS 'Timestamp when admin joined the conversation';
COMMENT ON COLUMN "sessions"."admin_invited_by" IS 'Profile ID of user who invited admin';
COMMENT ON COLUMN "sessions"."admin_invited_at" IS 'Timestamp when admin was invited';

COMMENT ON COLUMN "messages"."read_by" IS 'Profile ID of user who read the message (for read receipts)';
COMMENT ON COLUMN "messages"."message_type" IS 'Type of message: TEXT, IMAGE, VIDEO, PDF, SYSTEM';
COMMENT ON COLUMN "messages"."is_system_message" IS 'True for automated system messages (admin joined, dispute created, etc.)';
