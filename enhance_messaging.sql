-- Migration: enhance_messaging
-- Description: Ajout des fonctionnalités de messagerie instantanée avec litiges et participation admin

-- Sessions : dispute + admin tracking
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "dispute_declared_by" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "is_conversation_locked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "admin_joined_at" TIMESTAMP(3);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "admin_invited_by" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "admin_invited_at" TIMESTAMP(3);

-- Index pour performances
CREATE INDEX IF NOT EXISTS "sessions_is_conversation_locked_idx" ON "sessions"("is_conversation_locked");

-- Messages : read receipts + types
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "read_by" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "message_type" TEXT DEFAULT 'TEXT';
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "is_system_message" BOOLEAN NOT NULL DEFAULT false;

-- Index pour performances
CREATE INDEX IF NOT EXISTS "messages_message_type_idx" ON "messages"("message_type");
CREATE INDEX IF NOT EXISTS "messages_is_system_message_idx" ON "messages"("is_system_message");

-- Fin de la migration
