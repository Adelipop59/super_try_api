-- Add ugc_id column to transactions table (TEXT to match ugcs.id)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS ugc_id TEXT;

-- Add foreign key constraint to ugcs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_ugc'
  ) THEN
    ALTER TABLE transactions
    ADD CONSTRAINT fk_transactions_ugc
    FOREIGN KEY (ugc_id) REFERENCES ugcs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_ugc_id
ON transactions(ugc_id);
