-- À exécuter dans Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)

-- 1. Ajouter les colonnes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- 2. Créer les index uniques
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_key ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_account_id_key ON profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- 3. Vérifier que tout est OK
SELECT 'Migration terminée !' as status;

