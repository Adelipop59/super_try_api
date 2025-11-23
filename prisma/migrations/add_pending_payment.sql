-- Ajouter PENDING_PAYMENT à l'enum CampaignStatus
ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
