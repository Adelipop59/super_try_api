-- ==================================================================================
-- RENOMMAGE DES TABLES AVEC PRÉFIXE "TEST" - CONSERVATION DES DONNÉES
-- ==================================================================================
-- Ce script renomme les tables avec préfixe "test" pour enlever le préfixe.
-- TOUTES LES DONNÉES SONT CONSERVÉES.
--
-- Exécutez ce script via Supabase Studio (SQL Editor)
-- ==================================================================================

-- 1. Vérifier quelles tables avec préfixe "test" existent
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'test_%'
ORDER BY table_name;

-- 2. Renommer test_procedures en procedures_backup (si la table procedures existe déjà)
DO $$
BEGIN
    -- Vérifier si test_procedures existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'test_procedures'
    ) THEN
        -- Si procedures existe déjà, renommer test_procedures en procedures_backup
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'procedures'
        ) THEN
            ALTER TABLE "test_procedures" RENAME TO "procedures_backup";
            RAISE NOTICE 'Table test_procedures renommée en procedures_backup (car procedures existe déjà)';
        ELSE
            -- Sinon, renommer simplement en procedures
            ALTER TABLE "test_procedures" RENAME TO "procedures";
            RAISE NOTICE 'Table test_procedures renommée en procedures';
        END IF;
    ELSE
        RAISE NOTICE 'Table test_procedures n''existe pas';
    END IF;
END $$;

-- 3. Renommer test_distribution en distributions_backup (si la table distributions existe déjà)
DO $$
BEGIN
    -- Vérifier si test_distribution existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'test_distribution'
    ) THEN
        -- Si distributions existe déjà, renommer test_distribution en distributions_backup
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'distributions'
        ) THEN
            ALTER TABLE "test_distribution" RENAME TO "distributions_backup";
            RAISE NOTICE 'Table test_distribution renommée en distributions_backup (car distributions existe déjà)';
        ELSE
            -- Sinon, renommer simplement en distributions
            ALTER TABLE "test_distribution" RENAME TO "distributions";
            RAISE NOTICE 'Table test_distribution renommée en distributions';
        END IF;
    ELSE
        RAISE NOTICE 'Table test_distribution n''existe pas';
    END IF;
END $$;

-- 4. Renommer toutes les autres tables commençant par "test_" (au cas où)
DO $$
DECLARE
    table_record RECORD;
    new_name TEXT;
BEGIN
    FOR table_record IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name LIKE 'test_%'
          AND table_name NOT IN ('test_procedures', 'test_distribution')
    LOOP
        -- Enlever le préfixe "test_"
        new_name := substring(table_record.table_name from 6);

        -- Si la table sans préfixe existe déjà, ajouter "_backup"
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = new_name
        ) THEN
            new_name := new_name || '_backup';
        END IF;

        EXECUTE format('ALTER TABLE %I RENAME TO %I', table_record.table_name, new_name);
        RAISE NOTICE 'Table % renommée en %', table_record.table_name, new_name;
    END LOOP;
END $$;

-- ==================================================================================
-- FIN DU RENOMMAGE
-- ==================================================================================
SELECT 'Renommage des tables de test terminé avec succès!' as status;

-- Vérification finale : lister toutes les tables
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
