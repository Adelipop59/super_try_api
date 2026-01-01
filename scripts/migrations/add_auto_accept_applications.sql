-- Migration: Ajouter champ autoAcceptApplications à la table campaigns
-- Date: 2025-12-29
-- Description: Permet au PRO de choisir si les candidatures sont acceptées automatiquement ou manuellement

-- 1. Ajouter la colonne auto_accept_applications (défaut: false = validation manuelle)
ALTER TABLE campaigns
ADD COLUMN auto_accept_applications BOOLEAN NOT NULL DEFAULT false;

-- 2. Créer un index pour optimiser les requêtes sur ce champ
CREATE INDEX idx_campaigns_auto_accept ON campaigns(auto_accept_applications);

-- 3. Commentaire pour documentation
COMMENT ON COLUMN campaigns.auto_accept_applications IS 'Si true, les candidatures éligibles sont acceptées automatiquement. Si false, le PRO doit valider manuellement.';
