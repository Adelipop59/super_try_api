-- ==================================================================================
-- CRÉATION DES TABLES MANQUANTES
-- ==================================================================================
-- Ce script crée les tables qui n'existent pas encore dans la base de données
-- Exécutez ce script via Supabase Studio (SQL Editor)
-- ==================================================================================

-- 1. Créer la table offers si elle n'existe pas
CREATE TABLE IF NOT EXISTS "offers" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "reimbursed_price" BOOLEAN NOT NULL DEFAULT true,
    "reimbursed_shipping" BOOLEAN NOT NULL DEFAULT true,
    "max_reimbursed_price" DECIMAL(10,2),
    "max_reimbursed_shipping" DECIMAL(10,2),
    "bonus" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- 2. Ajouter les contraintes uniques si elles n'existent pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'offers_campaign_id_product_id_key'
    ) THEN
        ALTER TABLE "offers" ADD CONSTRAINT "offers_campaign_id_product_id_key" UNIQUE ("campaign_id", "product_id");
    END IF;
END $$;

-- 3. Créer les index si ils n'existent pas
CREATE INDEX IF NOT EXISTS "offers_campaign_id_idx" ON "offers"("campaign_id");
CREATE INDEX IF NOT EXISTS "offers_product_id_idx" ON "offers"("product_id");

-- 4. Ajouter les foreign keys si elles n'existent pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'offers_campaign_id_fkey'
    ) THEN
        ALTER TABLE "offers" ADD CONSTRAINT "offers_campaign_id_fkey"
        FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'offers_product_id_fkey'
    ) THEN
        ALTER TABLE "offers" ADD CONSTRAINT "offers_product_id_fkey"
        FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 5. Ajouter les colonnes manquantes aux tables existantes
DO $$
BEGIN
    -- Ajouter price à products si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='products' AND column_name='price'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "price" DECIMAL(10,2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Colonne price ajoutée à products';
    ELSE
        RAISE NOTICE 'Colonne price existe déjà dans products';
    END IF;

    -- Ajouter shipping_cost à products si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='products' AND column_name='shipping_cost'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "shipping_cost" DECIMAL(10,2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Colonne shipping_cost ajoutée à products';
    ELSE
        RAISE NOTICE 'Colonne shipping_cost existe déjà dans products';
    END IF;

    -- Ajouter max_units à distributions si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='distributions' AND column_name='max_units'
    ) THEN
        ALTER TABLE "distributions" ADD COLUMN "max_units" INTEGER NOT NULL DEFAULT 10;
        RAISE NOTICE 'Colonne max_units ajoutée à distributions';
    ELSE
        RAISE NOTICE 'Colonne max_units existe déjà dans distributions';
    END IF;

    -- Rendre day_of_week NOT NULL dans distributions
    UPDATE "distributions" SET "day_of_week" = 0 WHERE "day_of_week" IS NULL;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='distributions'
        AND column_name='day_of_week'
        AND is_nullable='YES'
    ) THEN
        ALTER TABLE "distributions" ALTER COLUMN "day_of_week" SET NOT NULL;
        RAISE NOTICE 'Colonne day_of_week de distributions est maintenant NOT NULL';
    ELSE
        RAISE NOTICE 'Colonne day_of_week de distributions est déjà NOT NULL';
    END IF;
END $$;

-- ==================================================================================
-- FIN DE LA MIGRATION
-- ==================================================================================
SELECT 'Migration terminée avec succès!' as status;

-- Vérification des tables créées
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('offers', 'products', 'distributions', 'campaigns')
ORDER BY table_name;
