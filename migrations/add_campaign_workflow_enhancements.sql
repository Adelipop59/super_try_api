-- Migration: Add Campaign Workflow Enhancements
-- Date: 2025-11-18
-- Description: Ajoute les fonctionnalités de gestion des campagnes complètes :
--   - Critères de sélection des testeurs
--   - Tracking de progression des steps
--   - Validation des prix
--   - Statut PENDING_PAYMENT pour les campagnes
--   - Données testeur enrichies

-- ============================================================================
-- 1. AJOUT DE PENDING_PAYMENT AU CampaignStatus ENUM
-- ============================================================================

ALTER TYPE "CampaignStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';

-- Note: L'ordre des valeurs dans l'enum sera: DRAFT, PENDING_PAYMENT, ACTIVE, COMPLETED, CANCELLED
-- Si vous voulez un ordre spécifique, il faut recréer l'enum complètement

-- ============================================================================
-- 2. AJOUT DE PRICE_VALIDATION AU StepType ENUM
-- ============================================================================

ALTER TYPE "StepType" ADD VALUE IF NOT EXISTS 'PRICE_VALIDATION';

-- ============================================================================
-- 3. AJOUT DES CHAMPS TESTEUR DANS LA TABLE profiles
-- ============================================================================

-- Ajouter les champs pour les testeurs
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "birth_date" TIMESTAMP(3);
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "average_rating" DECIMAL(3,2) DEFAULT 0;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "completed_sessions_count" INTEGER DEFAULT 0;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "preferred_categories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Ajouter des commentaires pour documentation
COMMENT ON COLUMN "profiles"."birth_date" IS 'Date de naissance pour calculer l''âge du testeur';
COMMENT ON COLUMN "profiles"."gender" IS 'Genre du testeur (M, F, Other)';
COMMENT ON COLUMN "profiles"."location" IS 'Ville/région du testeur';
COMMENT ON COLUMN "profiles"."average_rating" IS 'Note moyenne du testeur (0-5)';
COMMENT ON COLUMN "profiles"."completed_sessions_count" IS 'Nombre de tests complétés par le testeur';
COMMENT ON COLUMN "profiles"."preferred_categories" IS 'IDs des catégories préférées du testeur';

-- ============================================================================
-- 4. AJOUT DES CHAMPS PRIX DANS LA TABLE offers
-- ============================================================================

-- Ajouter les champs de prix
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "expected_price" DECIMAL(10,2);
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "shipping_cost" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "price_range_min" DECIMAL(10,2);
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "price_range_max" DECIMAL(10,2);
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "is_price_revealed" BOOLEAN DEFAULT false;

-- Ajouter des commentaires
COMMENT ON COLUMN "offers"."expected_price" IS 'Prix exact attendu du produit (défini par le vendeur)';
COMMENT ON COLUMN "offers"."shipping_cost" IS 'Frais de livraison attendus';
COMMENT ON COLUMN "offers"."price_range_min" IS 'Tranche de prix minimum montrée au testeur pour validation';
COMMENT ON COLUMN "offers"."price_range_max" IS 'Tranche de prix maximum montrée au testeur pour validation';
COMMENT ON COLUMN "offers"."is_price_revealed" IS 'Le prix exact est-il révélé aux testeurs? (true après validation complète de la procédure)';

-- ============================================================================
-- 5. CRÉATION DE LA TABLE campaign_criteria
-- ============================================================================

CREATE TABLE IF NOT EXISTS "campaign_criteria" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "min_age" INTEGER,
    "max_age" INTEGER,
    "min_rating" DECIMAL(3,2),
    "max_rating" DECIMAL(3,2),
    "min_completed_sessions" INTEGER,
    "required_gender" TEXT,
    "required_locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "required_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_criteria_pkey" PRIMARY KEY ("id")
);

-- Contrainte unique sur campaign_id (relation one-to-one)
ALTER TABLE "campaign_criteria" ADD CONSTRAINT "campaign_criteria_campaign_id_key" UNIQUE ("campaign_id");

-- Foreign key vers campaigns
ALTER TABLE "campaign_criteria" ADD CONSTRAINT "campaign_criteria_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index pour performance
CREATE INDEX IF NOT EXISTS "campaign_criteria_campaign_id_idx" ON "campaign_criteria"("campaign_id");

-- Commentaires
COMMENT ON TABLE "campaign_criteria" IS 'Critères de sélection des testeurs pour une campagne';
COMMENT ON COLUMN "campaign_criteria"."min_age" IS 'Âge minimum requis';
COMMENT ON COLUMN "campaign_criteria"."max_age" IS 'Âge maximum requis';
COMMENT ON COLUMN "campaign_criteria"."min_rating" IS 'Note minimum requise (0-5)';
COMMENT ON COLUMN "campaign_criteria"."max_rating" IS 'Note maximum requise (0-5)';
COMMENT ON COLUMN "campaign_criteria"."min_completed_sessions" IS 'Nombre minimum de tests complétés requis';
COMMENT ON COLUMN "campaign_criteria"."required_gender" IS 'Genre requis (M, F, ALL, null pour tous)';
COMMENT ON COLUMN "campaign_criteria"."required_locations" IS 'Liste des villes/régions acceptées';
COMMENT ON COLUMN "campaign_criteria"."required_categories" IS 'IDs des catégories requises dans les préférences testeur';

-- ============================================================================
-- 6. CRÉATION DE LA TABLE session_step_progress
-- ============================================================================

CREATE TABLE IF NOT EXISTS "session_step_progress" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "submission_data" JSONB,
    "validated_price" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_step_progress_pkey" PRIMARY KEY ("id")
);

-- Contrainte unique sur (session_id, step_id) - un step ne peut être complété qu'une fois par session
ALTER TABLE "session_step_progress" ADD CONSTRAINT "session_step_progress_session_id_step_id_key"
    UNIQUE ("session_id", "step_id");

-- Foreign keys
ALTER TABLE "session_step_progress" ADD CONSTRAINT "session_step_progress_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_step_progress" ADD CONSTRAINT "session_step_progress_step_id_fkey"
    FOREIGN KEY ("step_id") REFERENCES "steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index pour performance
CREATE INDEX IF NOT EXISTS "session_step_progress_session_id_idx" ON "session_step_progress"("session_id");
CREATE INDEX IF NOT EXISTS "session_step_progress_step_id_idx" ON "session_step_progress"("step_id");
CREATE INDEX IF NOT EXISTS "session_step_progress_is_completed_idx" ON "session_step_progress"("is_completed");

-- Commentaires
COMMENT ON TABLE "session_step_progress" IS 'Tracking de la progression des testeurs dans les steps des procédures';
COMMENT ON COLUMN "session_step_progress"."is_completed" IS 'Le step est-il complété?';
COMMENT ON COLUMN "session_step_progress"."completed_at" IS 'Date de complétion du step';
COMMENT ON COLUMN "session_step_progress"."submission_data" IS 'Données soumises (photos, vidéos, texte, réponses checklist, rating)';
COMMENT ON COLUMN "session_step_progress"."validated_price" IS 'Prix saisi par le testeur (pour step PRICE_VALIDATION uniquement)';

-- ============================================================================
-- 7. MISE À JOUR DES TRIGGERS updated_at POUR LES NOUVELLES TABLES
-- ============================================================================

-- Trigger pour campaign_criteria
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_campaign_criteria_updated_at ON "campaign_criteria";
CREATE TRIGGER update_campaign_criteria_updated_at
    BEFORE UPDATE ON "campaign_criteria"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour session_step_progress
DROP TRIGGER IF EXISTS update_session_step_progress_updated_at ON "session_step_progress";
CREATE TRIGGER update_session_step_progress_updated_at
    BEFORE UPDATE ON "session_step_progress"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. PERMISSIONS RLS (Row Level Security) - Si activé dans Supabase
-- ============================================================================

-- Activer RLS sur les nouvelles tables
ALTER TABLE "campaign_criteria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session_step_progress" ENABLE ROW LEVEL SECURITY;

-- Politique pour campaign_criteria : visible par le vendeur et les admins
CREATE POLICY "campaign_criteria_select_policy" ON "campaign_criteria"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "campaigns" c
            WHERE c."id" = "campaign_criteria"."campaign_id"
            AND (
                c."seller_id" = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM "profiles" p
                    WHERE p."supabase_user_id" = auth.uid()::text
                    AND p."role" = 'ADMIN'
                )
            )
        )
    );

CREATE POLICY "campaign_criteria_insert_policy" ON "campaign_criteria"
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "campaigns" c
            WHERE c."id" = "campaign_criteria"."campaign_id"
            AND c."seller_id" = auth.uid()::text
        )
    );

CREATE POLICY "campaign_criteria_update_policy" ON "campaign_criteria"
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM "campaigns" c
            WHERE c."id" = "campaign_criteria"."campaign_id"
            AND c."seller_id" = auth.uid()::text
        )
    );

CREATE POLICY "campaign_criteria_delete_policy" ON "campaign_criteria"
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM "campaigns" c
            WHERE c."id" = "campaign_criteria"."campaign_id"
            AND c."seller_id" = auth.uid()::text
        )
    );

-- Politique pour session_step_progress : visible par testeur, vendeur et admin
CREATE POLICY "session_step_progress_select_policy" ON "session_step_progress"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "sessions" s
            JOIN "campaigns" c ON s."campaign_id" = c."id"
            WHERE s."id" = "session_step_progress"."session_id"
            AND (
                s."tester_id" = auth.uid()::text
                OR c."seller_id" = auth.uid()::text
                OR EXISTS (
                    SELECT 1 FROM "profiles" p
                    WHERE p."supabase_user_id" = auth.uid()::text
                    AND p."role" = 'ADMIN'
                )
            )
        )
    );

CREATE POLICY "session_step_progress_insert_policy" ON "session_step_progress"
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "sessions" s
            WHERE s."id" = "session_step_progress"."session_id"
            AND s."tester_id" = auth.uid()::text
        )
    );

CREATE POLICY "session_step_progress_update_policy" ON "session_step_progress"
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM "sessions" s
            WHERE s."id" = "session_step_progress"."session_id"
            AND s."tester_id" = auth.uid()::text
        )
    );

-- ============================================================================
-- MIGRATION TERMINÉE
-- ============================================================================

-- Vérification des tables créées
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'New tables: campaign_criteria, session_step_progress';
    RAISE NOTICE 'Updated tables: profiles (tester fields), offers (price fields)';
    RAISE NOTICE 'Updated enums: CampaignStatus (+PENDING_PAYMENT), StepType (+PRICE_VALIDATION)';
END $$;
