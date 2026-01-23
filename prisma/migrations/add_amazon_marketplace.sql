-- Créer l'enum pour le mode marketplace
CREATE TYPE "CampaignMarketplaceMode" AS ENUM ('PROCEDURES', 'AMAZON_DIRECT_LINK');

-- Ajouter les colonnes à campaigns
ALTER TABLE campaigns
ADD COLUMN marketplace_mode "CampaignMarketplaceMode" NOT NULL DEFAULT 'PROCEDURES',
ADD COLUMN marketplace VARCHAR(10),
ADD COLUMN amazon_link TEXT;

-- Créer les index
CREATE INDEX idx_campaigns_marketplace_mode ON campaigns(marketplace_mode);
CREATE INDEX idx_campaigns_marketplace ON campaigns(marketplace);

-- Commentaires
COMMENT ON COLUMN campaigns.marketplace_mode IS 'Mode de la campagne: PROCEDURES (classique) ou AMAZON_DIRECT_LINK (lien direct sans procédures)';
COMMENT ON COLUMN campaigns.marketplace IS 'Code pays de la marketplace Amazon ciblée: FR, DE, UK, US, ES, IT, etc.';
COMMENT ON COLUMN campaigns.amazon_link IS 'URL du produit Amazon (requis si marketplaceMode = AMAZON_DIRECT_LINK)';
