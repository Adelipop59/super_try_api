-- Migration: Ajouter les champs UGC et validation d'achat à la table sessions
-- Date: 2026-01-03
-- Description: Ajout des champs pour gérer le flow complet UGC et validation d'achat

-- Champs pour validation d'achat par PRO
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS purchase_validated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS purchase_validation_comment TEXT,
ADD COLUMN IF NOT EXISTS purchase_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS purchase_rejected_at TIMESTAMP;

-- Champs pour UGC
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS ugc_requests JSONB, -- Liste des demandes UGC du PRO
ADD COLUMN IF NOT EXISTS ugc_requested_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS potential_ugc_bonus DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ugc_submissions JSONB, -- Liste des soumissions UGC du testeur
ADD COLUMN IF NOT EXISTS ugc_submitted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ugc_submission_message TEXT,
ADD COLUMN IF NOT EXISTS ugc_validated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ugc_validation_comment TEXT,
ADD COLUMN IF NOT EXISTS ugc_validated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ugc_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS ugc_rejected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ugc_declined BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ugc_decline_reason TEXT,
ADD COLUMN IF NOT EXISTS ugc_declined_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS final_ugc_bonus DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS closing_message TEXT;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sessions_ugc_requested ON sessions(ugc_requested_at);
CREATE INDEX IF NOT EXISTS idx_sessions_ugc_submitted ON sessions(ugc_submitted_at);
CREATE INDEX IF NOT EXISTS idx_sessions_ugc_validated ON sessions(ugc_validated);
CREATE INDEX IF NOT EXISTS idx_sessions_purchase_validated ON sessions(purchase_validated_at);

-- Commentaires
COMMENT ON COLUMN sessions.purchase_validated_at IS 'Date de validation de l''achat par le PRO';
COMMENT ON COLUMN sessions.purchase_validation_comment IS 'Commentaire lors de la validation de l''achat';
COMMENT ON COLUMN sessions.purchase_rejection_reason IS 'Raison du rejet de l''achat par le PRO';
COMMENT ON COLUMN sessions.purchase_rejected_at IS 'Date du rejet de l''achat';
COMMENT ON COLUMN sessions.ugc_requests IS 'JSON: Liste des demandes UGC (type, description, bonus, deadline)';
COMMENT ON COLUMN sessions.ugc_requested_at IS 'Date de demande des UGC par le PRO';
COMMENT ON COLUMN sessions.potential_ugc_bonus IS 'Bonus total potentiel si tous les UGC sont validés';
COMMENT ON COLUMN sessions.ugc_submissions IS 'JSON: Liste des soumissions UGC du testeur (type, contentUrl, comment)';
COMMENT ON COLUMN sessions.ugc_submitted_at IS 'Date de soumission des UGC';
COMMENT ON COLUMN sessions.ugc_submission_message IS 'Message du testeur lors de la soumission';
COMMENT ON COLUMN sessions.ugc_validated IS 'Les UGC ont été validés par le PRO';
COMMENT ON COLUMN sessions.ugc_validation_comment IS 'Commentaire de validation des UGC';
COMMENT ON COLUMN sessions.ugc_validated_at IS 'Date de validation des UGC';
COMMENT ON COLUMN sessions.ugc_rejection_reason IS 'Raison du rejet des UGC';
COMMENT ON COLUMN sessions.ugc_rejected_at IS 'Date du rejet des UGC';
COMMENT ON COLUMN sessions.ugc_declined IS 'Le testeur a refusé de soumettre les UGC';
COMMENT ON COLUMN sessions.ugc_decline_reason IS 'Raison du refus de soumettre les UGC';
COMMENT ON COLUMN sessions.ugc_declined_at IS 'Date du refus de soumettre les UGC';
COMMENT ON COLUMN sessions.final_ugc_bonus IS 'Bonus UGC final crédité au testeur';
COMMENT ON COLUMN sessions.closing_message IS 'Message de clôture du PRO';
