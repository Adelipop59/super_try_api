-- Ajouter la colonne category_id à campaigns
ALTER TABLE campaigns
ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Créer l'index
CREATE INDEX idx_campaigns_category_id ON campaigns(category_id);

-- Commentaire
COMMENT ON COLUMN campaigns.category_id IS 'Catégorie de la campagne (optionnel)';
