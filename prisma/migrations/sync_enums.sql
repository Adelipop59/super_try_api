-- Synchronisation des ENUMs avec le schéma Prisma

-- Ajouter PENDING_PAYMENT à CampaignStatus si non existant
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PENDING_PAYMENT' AND enumtypid = 'public."CampaignStatus"'::regtype) THEN
        ALTER TYPE "public"."CampaignStatus" ADD VALUE 'PENDING_PAYMENT' AFTER 'DRAFT';
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        -- L'enum n'existe pas encore, sera créé par Prisma
        NULL;
END $$;

-- Vérifier que les autres valeurs de l'enum existent
-- (DRAFT, ACTIVE, COMPLETED, CANCELLED)

-- Ajouter DistributionType si nécessaire
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DistributionType') THEN
        CREATE TYPE "public"."DistributionType" AS ENUM ('RECURRING', 'SPECIFIC_DATE');
    END IF;
END $$;

-- Afficher les valeurs actuelles des enums pour vérification
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'public."CampaignStatus"'::regtype
ORDER BY enumsortorder;
