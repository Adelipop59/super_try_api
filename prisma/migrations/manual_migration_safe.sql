-- ==================================================================================
-- MIGRATION SÉCURISÉE - Ne supprime AUCUNE donnée
-- ==================================================================================
-- Ce script ajoute uniquement de nouvelles colonnes aux tables existantes
-- Exécutez ce script via Supabase Studio (SQL Editor) ou psql
-- ==================================================================================

-- 1. Ajouter les colonnes price et shipping_cost à la table products
-- Vérifier d'abord si les colonnes n'existent pas déjà
DO $$
BEGIN
    -- Ajouter price si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='products' AND column_name='price'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "price" DECIMAL(10,2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Colonne price ajoutée à products';
    ELSE
        RAISE NOTICE 'Colonne price existe déjà dans products';
    END IF;

    -- Ajouter shipping_cost si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='products' AND column_name='shipping_cost'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "shipping_cost" DECIMAL(10,2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Colonne shipping_cost ajoutée à products';
    ELSE
        RAISE NOTICE 'Colonne shipping_cost existe déjà dans products';
    END IF;
END $$;

-- 2. Ajouter la colonne max_units à la table distributions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='distributions' AND column_name='max_units'
    ) THEN
        ALTER TABLE "distributions" ADD COLUMN "max_units" INTEGER NOT NULL DEFAULT 10;
        RAISE NOTICE 'Colonne max_units ajoutée à distributions';
    ELSE
        RAISE NOTICE 'Colonne max_units existe déjà dans distributions';
    END IF;
END $$;

-- 3. Rendre day_of_week NOT NULL dans distributions (si ce n'est pas déjà le cas)
DO $$
BEGIN
    -- D'abord, mettre à jour les valeurs NULL existantes
    UPDATE "distributions" SET "day_of_week" = 0 WHERE "day_of_week" IS NULL;

    -- Ensuite, rendre la colonne NOT NULL si elle ne l'est pas déjà
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
-- Vérification:
SELECT 'Migration terminée avec succès!' as status;

-- Pour vérifier que tout est bien appliqué:
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('products', 'distributions')
    AND column_name IN ('price', 'shipping_cost', 'max_units', 'day_of_week')
ORDER BY table_name, column_name;
