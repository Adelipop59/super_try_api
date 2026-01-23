-- Add auth_provider column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50);

-- Add is_onboarded column to profiles table (should already exist from schema)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN NOT NULL DEFAULT true;

-- Create index on auth_provider for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider ON profiles(auth_provider);

-- Comment explaining the columns
COMMENT ON COLUMN profiles.auth_provider IS 'OAuth provider used for authentication: google, azure, github, or null for email/password';
COMMENT ON COLUMN profiles.is_onboarded IS 'Whether the user has completed their profile onboarding (false for OAuth users until completion)';
