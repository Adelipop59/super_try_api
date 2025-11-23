-- Migration: Ajouter PENDING_PAYMENT à l'enum CampaignStatus
-- Cette migration ajoute le statut PENDING_PAYMENT pour le paiement des campagnes

-- Ajouter la nouvelle valeur à l'enum
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
