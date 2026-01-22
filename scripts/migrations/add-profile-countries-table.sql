-- Migration: Ajouter la table de liaison ProfileCountry pour les PRO
-- Permet aux vendeurs de sélectionner plusieurs pays pour leurs campagnes

-- Créer la table de liaison
CREATE TABLE IF NOT EXISTS "profile_countries" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "profile_id" TEXT NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "country_code" VARCHAR(2) NOT NULL REFERENCES "countries"("code") ON DELETE CASCADE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE("profile_id", "country_code")
);

-- Indexs pour performance
CREATE INDEX IF NOT EXISTS "profile_countries_profile_id_idx" ON "profile_countries"("profile_id");
CREATE INDEX IF NOT EXISTS "profile_countries_country_code_idx" ON "profile_countries"("country_code");

-- Commentaires
COMMENT ON TABLE "profile_countries" IS 'Table de liaison entre les profils PRO et les pays dans lesquels ils peuvent créer des campagnes';
COMMENT ON COLUMN "profile_countries"."profile_id" IS 'ID du profil PRO';
COMMENT ON COLUMN "profile_countries"."country_code" IS 'Code pays ISO 3166-1 alpha-2';
