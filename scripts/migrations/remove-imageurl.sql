-- Migration: Supprimer la colonne image_url de la table products
-- Date: 2026-01-23

ALTER TABLE products DROP COLUMN IF EXISTS image_url;

-- Vérifier que la colonne a été supprimée
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name = 'image_url';
-- Devrait retourner 0 lignes
