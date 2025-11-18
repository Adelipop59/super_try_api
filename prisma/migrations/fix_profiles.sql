-- Ajouter les colonnes manquantes à la table profiles
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "birth_date" TIMESTAMP(3);
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "average_rating" DECIMAL(3,2) DEFAULT 0;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "completed_sessions_count" INTEGER DEFAULT 0;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "preferred_categories" TEXT[] DEFAULT '{}';
