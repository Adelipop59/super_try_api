-- Add authProvider column to Profile table
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "authProvider" TEXT;

-- Add comment
COMMENT ON COLUMN "Profile"."authProvider" IS 'OAuth provider used for authentication (google, azure, github, or null for email/password)';
