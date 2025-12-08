-- Migration: add_kyc_fields
-- Description: Ajout des champs KYC Stripe Identity pour vérification d'identité des testeurs

-- Ajouter les champs KYC au profil utilisateur
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "stripe_verification_session_id" TEXT UNIQUE;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "verification_status" TEXT DEFAULT 'unverified';
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3);
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "verification_failed_reason" TEXT;

-- Créer l'index pour améliorer les performances des requêtes de filtrage par statut de vérification
CREATE INDEX IF NOT EXISTS "profiles_verification_status_idx" ON "profiles"("verification_status");

-- Fin de la migration
