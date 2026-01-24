-- Add keywords column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';
