-- Migration: Ajouter nouveaux statuts de session
-- Date: 2025-12-29
-- Description: Ajout de statuts intermédiaires pour le flow complet de session

-- 1. Ajouter les nouveaux statuts à l'enum SessionStatus
ALTER TYPE "SessionStatus" ADD VALUE IF NOT EXISTS 'PRICE_VALIDATED';
ALTER TYPE "SessionStatus" ADD VALUE IF NOT EXISTS 'PURCHASE_SUBMITTED';
ALTER TYPE "SessionStatus" ADD VALUE IF NOT EXISTS 'PURCHASE_VALIDATED';
ALTER TYPE "SessionStatus" ADD VALUE IF NOT EXISTS 'PROCEDURES_COMPLETED';
ALTER TYPE "SessionStatus" ADD VALUE IF NOT EXISTS 'UGC_REQUESTED';
ALTER TYPE "SessionStatus" ADD VALUE IF NOT EXISTS 'UGC_SUBMITTED';
ALTER TYPE "SessionStatus" ADD VALUE IF NOT EXISTS 'PENDING_CLOSURE';

-- Note: Les valeurs sont ajoutées dans l'ordre chronologique du flow
-- PENDING → ACCEPTED → PRICE_VALIDATED → PURCHASE_SUBMITTED → PURCHASE_VALIDATED
-- → IN_PROGRESS → PROCEDURES_COMPLETED → SUBMITTED → UGC_REQUESTED → UGC_SUBMITTED
-- → PENDING_CLOSURE → COMPLETED
