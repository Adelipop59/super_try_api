-- Create criteria_templates table
CREATE TABLE IF NOT EXISTS "criteria_templates" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "seller_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "min_age" INTEGER,
    "max_age" INTEGER,
    "min_rating" DECIMAL(3,2),
    "max_rating" DECIMAL(3,2),
    "min_completed_sessions" INTEGER,
    "required_gender" TEXT,
    "required_countries" TEXT[] DEFAULT '{}',
    "required_locations" TEXT[] DEFAULT '{}',
    "excluded_locations" TEXT[] DEFAULT '{}',
    "required_categories" TEXT[] DEFAULT '{}',
    "no_active_session_with_seller" BOOLEAN NOT NULL DEFAULT false,
    "max_sessions_per_week" INTEGER,
    "max_sessions_per_month" INTEGER,
    "min_completion_rate" DECIMAL(5,2),
    "max_cancellation_rate" DECIMAL(5,2),
    "min_account_age" INTEGER,
    "last_active_within_days" INTEGER,
    "require_verified" BOOLEAN NOT NULL DEFAULT false,
    "require_prime" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "criteria_templates_pkey" PRIMARY KEY ("id")
);

-- Create index on seller_id
CREATE INDEX IF NOT EXISTS "criteria_templates_seller_id_idx" ON "criteria_templates"("seller_id");

-- Add foreign key constraint
ALTER TABLE "criteria_templates"
ADD CONSTRAINT "criteria_templates_seller_id_fkey"
FOREIGN KEY ("seller_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
