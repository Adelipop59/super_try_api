-- Add keywords column to campaigns table
ALTER TABLE "campaigns" ADD COLUMN "keywords" TEXT[] DEFAULT '{}';
