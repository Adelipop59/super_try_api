-- Add Stripe Customer ID and Account ID to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_key ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_account_id_key ON profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;
