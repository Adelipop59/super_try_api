-- Migration: Ajouter le champ country à la table profiles
-- Date: 2025-12-23
-- Description: Permet de stocker le code pays extrait de Stripe Identity

-- Ajouter la colonne country
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS country VARCHAR(255);

-- Commentaire sur la colonne
COMMENT ON COLUMN profiles.country IS 'Code pays (ex: FR, US) extrait de Stripe Identity ou saisi manuellement';
