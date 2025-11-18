-- ==================================================================================
-- CRÉATION COMPLÈTE DU SCHÉMA - SANS SUPPRESSION DE DONNÉES
-- ==================================================================================
-- Ce script crée TOUTES les tables du schéma Prisma avec IF NOT EXISTS
-- Les tables existantes et leurs données sont préservées
-- Exécutez ce script via Supabase Studio (SQL Editor)
-- ==================================================================================

-- ==================================================================================
-- 1. CRÉATION DES ENUMS
-- ==================================================================================

DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('USER', 'PRO', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "LogLevel" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'DEBUG');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "LogCategory" AS ENUM ('AUTH', 'USER', 'PRODUCT', 'CAMPAIGN', 'PROCEDURE', 'SESSION', 'WALLET', 'MESSAGE', 'ADMIN', 'SYSTEM', 'TEST', 'TEST_API');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "StepType" AS ENUM ('TEXT', 'PHOTO', 'VIDEO', 'CHECKLIST', 'RATING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM ('SESSION_APPLIED', 'SESSION_ACCEPTED', 'SESSION_REJECTED', 'PURCHASE_SUBMITTED', 'TEST_SUBMITTED', 'TEST_VALIDATED', 'SESSION_CANCELLED', 'DISPUTE_CREATED', 'MESSAGE_RECEIVED', 'PAYMENT_RECEIVED', 'CAMPAIGN_CREATED', 'CAMPAIGN_ENDING_SOON', 'SYSTEM_ALERT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'DISPUTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DistributionType" AS ENUM ('RECURRING', 'SPECIFIC_DATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BonusTaskType" AS ENUM ('UNBOXING_PHOTO', 'UGC_VIDEO', 'EXTERNAL_REVIEW', 'TIP', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BonusTaskStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'REJECTED', 'SUBMITTED', 'VALIDATED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==================================================================================
-- 2. CRÉATION DES TABLES
-- ==================================================================================

-- Table: profiles
CREATE TABLE IF NOT EXISTS "profiles" (
    "id" TEXT NOT NULL,
    "supabase_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "avatar" TEXT,
    "company_name" TEXT,
    "siret" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- Table: products (avec price et shipping_cost)
CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "image_url" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "shipping_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- Table: campaigns
CREATE TABLE IF NOT EXISTS "campaigns" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "total_slots" INTEGER NOT NULL,
    "available_slots" INTEGER NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- Table: offers
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- Table: system_logs
CREATE TABLE IF NOT EXISTS "system_logs" (
    "id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL,
    "category" "LogCategory" NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "user_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "endpoint" TEXT,
    "method" TEXT,
    "status_code" INTEGER,
    "duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- Table: procedures
CREATE TABLE IF NOT EXISTS "procedures" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- Table: steps
CREATE TABLE IF NOT EXISTS "steps" (
    "id" TEXT NOT NULL,
    "procedure_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "StepType" NOT NULL DEFAULT 'TEXT',
    "order" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "checklist_items" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "steps_pkey" PRIMARY KEY ("id")
);

-- Table: distributions (avec max_units)
CREATE TABLE IF NOT EXISTS "distributions" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "type" "DistributionType" NOT NULL,
    "day_of_week" INTEGER NOT NULL DEFAULT 0,
    "specific_date" TIMESTAMP(3),
    "max_units" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distributions_pkey" PRIMARY KEY ("id")
);

-- Table: sessions
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "tester_id" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "application_message" TEXT,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "scheduled_purchase_date" TIMESTAMP(3),
    "purchase_proof_url" TEXT,
    "purchased_at" TIMESTAMP(3),
    "order_number" TEXT,
    "order_number_validated_at" TIMESTAMP(3),
    "validated_product_price" DECIMAL(10,2),
    "price_validated_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "submission_data" JSONB,
    "completed_at" TIMESTAMP(3),
    "product_price" DECIMAL(10,2),
    "shipping_cost" DECIMAL(10,2),
    "reward_amount" DECIMAL(10,2),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "disputed_at" TIMESTAMP(3),
    "dispute_reason" TEXT,
    "dispute_resolved_at" TIMESTAMP(3),
    "dispute_resolution" TEXT,
    "rating" INTEGER,
    "rating_comment" TEXT,
    "rated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- Table: messages
CREATE TABLE IF NOT EXISTS "messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "is_sent" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "error" TEXT,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Table: notification_preferences
CREATE TABLE IF NOT EXISTS "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "session_notifications" BOOLEAN NOT NULL DEFAULT true,
    "message_notifications" BOOLEAN NOT NULL DEFAULT true,
    "payment_notifications" BOOLEAN NOT NULL DEFAULT true,
    "campaign_notifications" BOOLEAN NOT NULL DEFAULT true,
    "system_notifications" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- Table: campaign_reviews
CREATE TABLE IF NOT EXISTS "campaign_reviews" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "tester_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "republish_proposed" BOOLEAN NOT NULL DEFAULT false,
    "republish_accepted" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_reviews_pkey" PRIMARY KEY ("id")
);

-- Table: bonus_tasks
CREATE TABLE IF NOT EXISTS "bonus_tasks" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "type" "BonusTaskType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reward" DECIMAL(10,2) NOT NULL,
    "status" "BonusTaskStatus" NOT NULL DEFAULT 'REQUESTED',
    "submission_urls" TEXT[],
    "submitted_at" TIMESTAMP(3),
    "validated_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "requested_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bonus_tasks_pkey" PRIMARY KEY ("id")
);

-- ==================================================================================
-- 3. AJOUT DES COLONNES MANQUANTES (si les tables existaient déjà)
-- ==================================================================================

DO $$
BEGIN
    -- Ajouter price à products si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='products' AND column_name='price'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "price" DECIMAL(10,2) NOT NULL DEFAULT 0;
        RAISE NOTICE '✓ Colonne price ajoutée à products';
    ELSE
        RAISE NOTICE '- Colonne price existe déjà dans products';
    END IF;

    -- Ajouter shipping_cost à products si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='products' AND column_name='shipping_cost'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "shipping_cost" DECIMAL(10,2) NOT NULL DEFAULT 0;
        RAISE NOTICE '✓ Colonne shipping_cost ajoutée à products';
    ELSE
        RAISE NOTICE '- Colonne shipping_cost existe déjà dans products';
    END IF;

    -- Ajouter max_units à distributions si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='distributions' AND column_name='max_units'
    ) THEN
        ALTER TABLE "distributions" ADD COLUMN "max_units" INTEGER NOT NULL DEFAULT 10;
        RAISE NOTICE '✓ Colonne max_units ajoutée à distributions';
    ELSE
        RAISE NOTICE '- Colonne max_units existe déjà dans distributions';
    END IF;

    -- Rendre day_of_week NOT NULL dans distributions
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='distributions'
        AND column_name='day_of_week'
        AND is_nullable='YES'
    ) THEN
        UPDATE "distributions" SET "day_of_week" = 0 WHERE "day_of_week" IS NULL;
        ALTER TABLE "distributions" ALTER COLUMN "day_of_week" SET NOT NULL;
        ALTER TABLE "distributions" ALTER COLUMN "day_of_week" SET DEFAULT 0;
        RAISE NOTICE '✓ Colonne day_of_week de distributions est maintenant NOT NULL';
    ELSE
        RAISE NOTICE '- Colonne day_of_week de distributions est déjà NOT NULL';
    END IF;
END $$;

-- ==================================================================================
-- 4. CRÉATION DES INDEX
-- ==================================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "profiles_supabase_user_id_key" ON "profiles"("supabase_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_email_key" ON "profiles"("email");
CREATE INDEX IF NOT EXISTS "profiles_email_idx" ON "profiles"("email");
CREATE INDEX IF NOT EXISTS "profiles_supabase_user_id_idx" ON "profiles"("supabase_user_id");
CREATE INDEX IF NOT EXISTS "profiles_role_idx" ON "profiles"("role");

CREATE INDEX IF NOT EXISTS "products_seller_id_idx" ON "products"("seller_id");
CREATE INDEX IF NOT EXISTS "products_is_active_idx" ON "products"("is_active");
CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products"("category");

CREATE INDEX IF NOT EXISTS "campaigns_seller_id_idx" ON "campaigns"("seller_id");
CREATE INDEX IF NOT EXISTS "campaigns_status_idx" ON "campaigns"("status");
CREATE INDEX IF NOT EXISTS "campaigns_start_date_idx" ON "campaigns"("start_date");
CREATE INDEX IF NOT EXISTS "campaigns_end_date_idx" ON "campaigns"("end_date");

CREATE INDEX IF NOT EXISTS "offers_campaign_id_idx" ON "offers"("campaign_id");
CREATE INDEX IF NOT EXISTS "offers_product_id_idx" ON "offers"("product_id");
CREATE UNIQUE INDEX IF NOT EXISTS "offers_campaign_id_product_id_key" ON "offers"("campaign_id", "product_id");

CREATE INDEX IF NOT EXISTS "system_logs_level_idx" ON "system_logs"("level");
CREATE INDEX IF NOT EXISTS "system_logs_category_idx" ON "system_logs"("category");
CREATE INDEX IF NOT EXISTS "system_logs_user_id_idx" ON "system_logs"("user_id");
CREATE INDEX IF NOT EXISTS "system_logs_created_at_idx" ON "system_logs"("created_at");

CREATE INDEX IF NOT EXISTS "procedures_campaign_id_idx" ON "procedures"("campaign_id");
CREATE INDEX IF NOT EXISTS "procedures_order_idx" ON "procedures"("order");

CREATE INDEX IF NOT EXISTS "steps_procedure_id_idx" ON "steps"("procedure_id");
CREATE INDEX IF NOT EXISTS "steps_order_idx" ON "steps"("order");

CREATE INDEX IF NOT EXISTS "distributions_campaign_id_idx" ON "distributions"("campaign_id");
CREATE INDEX IF NOT EXISTS "distributions_type_idx" ON "distributions"("type");
CREATE INDEX IF NOT EXISTS "distributions_day_of_week_idx" ON "distributions"("day_of_week");
CREATE INDEX IF NOT EXISTS "distributions_specific_date_idx" ON "distributions"("specific_date");
CREATE INDEX IF NOT EXISTS "distributions_is_active_idx" ON "distributions"("is_active");

CREATE INDEX IF NOT EXISTS "sessions_campaign_id_idx" ON "sessions"("campaign_id");
CREATE INDEX IF NOT EXISTS "sessions_tester_id_idx" ON "sessions"("tester_id");
CREATE INDEX IF NOT EXISTS "sessions_status_idx" ON "sessions"("status");
CREATE INDEX IF NOT EXISTS "sessions_applied_at_idx" ON "sessions"("applied_at");
CREATE INDEX IF NOT EXISTS "sessions_created_at_idx" ON "sessions"("created_at");

CREATE INDEX IF NOT EXISTS "messages_session_id_idx" ON "messages"("session_id");
CREATE INDEX IF NOT EXISTS "messages_sender_id_idx" ON "messages"("sender_id");
CREATE INDEX IF NOT EXISTS "messages_is_read_idx" ON "messages"("is_read");
CREATE INDEX IF NOT EXISTS "messages_created_at_idx" ON "messages"("created_at");

CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications"("type");
CREATE INDEX IF NOT EXISTS "notifications_channel_idx" ON "notifications"("channel");
CREATE INDEX IF NOT EXISTS "notifications_is_sent_idx" ON "notifications"("is_sent");
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications"("is_read");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_user_id_key" ON "notification_preferences"("user_id");
CREATE INDEX IF NOT EXISTS "notification_preferences_user_id_idx" ON "notification_preferences"("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "campaign_reviews_session_id_key" ON "campaign_reviews"("session_id");
CREATE INDEX IF NOT EXISTS "campaign_reviews_campaign_id_idx" ON "campaign_reviews"("campaign_id");
CREATE INDEX IF NOT EXISTS "campaign_reviews_product_id_idx" ON "campaign_reviews"("product_id");
CREATE INDEX IF NOT EXISTS "campaign_reviews_tester_id_idx" ON "campaign_reviews"("tester_id");
CREATE INDEX IF NOT EXISTS "campaign_reviews_session_id_idx" ON "campaign_reviews"("session_id");
CREATE INDEX IF NOT EXISTS "campaign_reviews_rating_idx" ON "campaign_reviews"("rating");
CREATE INDEX IF NOT EXISTS "campaign_reviews_is_public_idx" ON "campaign_reviews"("is_public");
CREATE INDEX IF NOT EXISTS "campaign_reviews_created_at_idx" ON "campaign_reviews"("created_at");

CREATE INDEX IF NOT EXISTS "bonus_tasks_session_id_idx" ON "bonus_tasks"("session_id");
CREATE INDEX IF NOT EXISTS "bonus_tasks_status_idx" ON "bonus_tasks"("status");
CREATE INDEX IF NOT EXISTS "bonus_tasks_requested_by_idx" ON "bonus_tasks"("requested_by");
CREATE INDEX IF NOT EXISTS "bonus_tasks_created_at_idx" ON "bonus_tasks"("created_at");

-- ==================================================================================
-- 5. AJOUT DES FOREIGN KEYS
-- ==================================================================================

DO $$
BEGIN
    -- products -> profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_seller_id_fkey'
    ) THEN
        ALTER TABLE "products" ADD CONSTRAINT "products_seller_id_fkey"
        FOREIGN KEY ("seller_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- campaigns -> profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_seller_id_fkey'
    ) THEN
        ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_seller_id_fkey"
        FOREIGN KEY ("seller_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- offers -> campaigns
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'offers_campaign_id_fkey'
    ) THEN
        ALTER TABLE "offers" ADD CONSTRAINT "offers_campaign_id_fkey"
        FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- offers -> products
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'offers_product_id_fkey'
    ) THEN
        ALTER TABLE "offers" ADD CONSTRAINT "offers_product_id_fkey"
        FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- system_logs -> profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'system_logs_user_id_fkey'
    ) THEN
        ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- procedures -> campaigns
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'procedures_campaign_id_fkey'
    ) THEN
        ALTER TABLE "procedures" ADD CONSTRAINT "procedures_campaign_id_fkey"
        FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- steps -> procedures
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'steps_procedure_id_fkey'
    ) THEN
        ALTER TABLE "steps" ADD CONSTRAINT "steps_procedure_id_fkey"
        FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- distributions -> campaigns
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'distributions_campaign_id_fkey'
    ) THEN
        ALTER TABLE "distributions" ADD CONSTRAINT "distributions_campaign_id_fkey"
        FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- sessions -> campaigns
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sessions_campaign_id_fkey'
    ) THEN
        ALTER TABLE "sessions" ADD CONSTRAINT "sessions_campaign_id_fkey"
        FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- sessions -> profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sessions_tester_id_fkey'
    ) THEN
        ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tester_id_fkey"
        FOREIGN KEY ("tester_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- messages -> sessions
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'messages_session_id_fkey'
    ) THEN
        ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_fkey"
        FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- messages -> profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'messages_sender_id_fkey'
    ) THEN
        ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey"
        FOREIGN KEY ("sender_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- notifications -> profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey'
    ) THEN
        ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- notification_preferences -> profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_user_id_fkey'
    ) THEN
        ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- campaign_reviews -> campaigns
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'campaign_reviews_campaign_id_fkey'
    ) THEN
        ALTER TABLE "campaign_reviews" ADD CONSTRAINT "campaign_reviews_campaign_id_fkey"
        FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- campaign_reviews -> products
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'campaign_reviews_product_id_fkey'
    ) THEN
        ALTER TABLE "campaign_reviews" ADD CONSTRAINT "campaign_reviews_product_id_fkey"
        FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- campaign_reviews -> profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'campaign_reviews_tester_id_fkey'
    ) THEN
        ALTER TABLE "campaign_reviews" ADD CONSTRAINT "campaign_reviews_tester_id_fkey"
        FOREIGN KEY ("tester_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- campaign_reviews -> sessions
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'campaign_reviews_session_id_fkey'
    ) THEN
        ALTER TABLE "campaign_reviews" ADD CONSTRAINT "campaign_reviews_session_id_fkey"
        FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- bonus_tasks -> sessions
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bonus_tasks_session_id_fkey'
    ) THEN
        ALTER TABLE "bonus_tasks" ADD CONSTRAINT "bonus_tasks_session_id_fkey"
        FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- bonus_tasks -> profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bonus_tasks_requested_by_fkey'
    ) THEN
        ALTER TABLE "bonus_tasks" ADD CONSTRAINT "bonus_tasks_requested_by_fkey"
        FOREIGN KEY ("requested_by") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ==================================================================================
-- FIN DE LA CRÉATION DU SCHÉMA COMPLET
-- ==================================================================================
SELECT '✓ Schéma complet créé avec succès! Toutes les données existantes ont été préservées.' as status;

-- Vérification finale : lister toutes les tables créées
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
