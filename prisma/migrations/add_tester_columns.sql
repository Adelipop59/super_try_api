-- Ajouter les colonnes manquantes pour les testeurs dans la table profiles
-- Exécutez ce script via Supabase Studio (SQL Editor)

DO $$
BEGIN
    -- Ajouter birth_date si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='profiles' AND column_name='birth_date'
    ) THEN
        ALTER TABLE "profiles" ADD COLUMN "birth_date" TIMESTAMP(3);
        RAISE NOTICE '✓ Colonne birth_date ajoutée à profiles';
    ELSE
        RAISE NOTICE '- Colonne birth_date existe déjà dans profiles';
    END IF;

    -- Ajouter gender si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='profiles' AND column_name='gender'
    ) THEN
        ALTER TABLE "profiles" ADD COLUMN "gender" TEXT;
        RAISE NOTICE '✓ Colonne gender ajoutée à profiles';
    ELSE
        RAISE NOTICE '- Colonne gender existe déjà dans profiles';
    END IF;

    -- Ajouter location si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='profiles' AND column_name='location'
    ) THEN
        ALTER TABLE "profiles" ADD COLUMN "location" TEXT;
        RAISE NOTICE '✓ Colonne location ajoutée à profiles';
    ELSE
        RAISE NOTICE '- Colonne location existe déjà dans profiles';
    END IF;

    -- Ajouter average_rating si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='profiles' AND column_name='average_rating'
    ) THEN
        ALTER TABLE "profiles" ADD COLUMN "average_rating" DECIMAL(3,2) DEFAULT 0;
        RAISE NOTICE '✓ Colonne average_rating ajoutée à profiles';
    ELSE
        RAISE NOTICE '- Colonne average_rating existe déjà dans profiles';
    END IF;

    -- Ajouter completed_sessions_count si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='profiles' AND column_name='completed_sessions_count'
    ) THEN
        ALTER TABLE "profiles" ADD COLUMN "completed_sessions_count" INTEGER DEFAULT 0;
        RAISE NOTICE '✓ Colonne completed_sessions_count ajoutée à profiles';
    ELSE
        RAISE NOTICE '- Colonne completed_sessions_count existe déjà dans profiles';
    END IF;

    -- Ajouter preferred_categories si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='profiles' AND column_name='preferred_categories'
    ) THEN
        ALTER TABLE "profiles" ADD COLUMN "preferred_categories" TEXT[] DEFAULT '{}';
        RAISE NOTICE '✓ Colonne preferred_categories ajoutée à profiles';
    ELSE
        RAISE NOTICE '- Colonne preferred_categories existe déjà dans profiles';
    END IF;
END $$;

SELECT '✓ Colonnes testeur ajoutées avec succès!' as status;
