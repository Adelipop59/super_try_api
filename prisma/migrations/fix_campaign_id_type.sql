-- Fix: Change campaign_id from UUID to TEXT to match campaigns.id type

-- Drop existing column and recreate with correct type
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "campaign_id";
ALTER TABLE "transactions" ADD COLUMN "campaign_id" TEXT;

-- Create index
CREATE INDEX IF NOT EXISTS "transactions_campaign_id_idx" ON "transactions"("campaign_id");

-- Add foreign key constraint
ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_campaign_id_fkey"
FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
