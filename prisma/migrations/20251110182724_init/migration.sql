-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'PRO', 'ADMIN');

-- CreateTable
CREATE TABLE "profiles" (
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_supabase_user_id_key" ON "profiles"("supabase_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_email_idx" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_supabase_user_id_idx" ON "profiles"("supabase_user_id");

-- CreateIndex
CREATE INDEX "profiles_role_idx" ON "profiles"("role");
