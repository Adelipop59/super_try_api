-- Migration: Ajouter escrow_amount à la table campaigns
-- Date: 2026-02-01
-- Description: Ajoute le champ escrow_amount pour tracker les fonds bloqués par campagne

-- Ajouter la colonne escrow_amount avec valeur par défaut 0
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS escrow_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN campaigns.escrow_amount IS 'Montant bloqué en escrow pour cette campagne (produits + bonus testeurs)';

-- Index pour optimiser les requêtes d'agrégation escrow par seller
CREATE INDEX IF NOT EXISTS idx_campaigns_escrow_seller
ON campaigns(seller_id, status, escrow_amount)
WHERE status IN ('ACTIVE', 'PENDING_PAYMENT');
