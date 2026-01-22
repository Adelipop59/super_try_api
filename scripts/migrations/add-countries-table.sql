-- Migration: Add countries table for PRO seller registration
-- Date: 2026-01-19
-- Description: Creates table for countries with availability status

-- Create countries table
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(2) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  name_fr VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  region VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_countries_is_active ON countries(is_active);
CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);

-- Seed: Top 20 European markets
INSERT INTO countries (code, name, name_en, name_fr, region, is_active) VALUES
('FR', 'France', 'France', 'France', 'Western Europe', true),
('DE', 'Germany', 'Germany', 'Allemagne', 'Western Europe', true),
('GB', 'United Kingdom', 'United Kingdom', 'Royaume-Uni', 'Northern Europe', true),
('ES', 'Spain', 'Spain', 'Espagne', 'Southern Europe', false),
('IT', 'Italy', 'Italy', 'Italie', 'Southern Europe', false),
('NL', 'Netherlands', 'Netherlands', 'Pays-Bas', 'Western Europe', false),
('BE', 'Belgium', 'Belgium', 'Belgique', 'Western Europe', false),
('CH', 'Switzerland', 'Switzerland', 'Suisse', 'Western Europe', false),
('AT', 'Austria', 'Austria', 'Autriche', 'Western Europe', false),
('SE', 'Sweden', 'Sweden', 'Suède', 'Northern Europe', false),
('NO', 'Norway', 'Norway', 'Norvège', 'Northern Europe', false),
('DK', 'Denmark', 'Denmark', 'Danemark', 'Northern Europe', false),
('FI', 'Finland', 'Finland', 'Finlande', 'Northern Europe', false),
('PL', 'Poland', 'Poland', 'Pologne', 'Eastern Europe', false),
('PT', 'Portugal', 'Portugal', 'Portugal', 'Southern Europe', false),
('IE', 'Ireland', 'Ireland', 'Irlande', 'Northern Europe', false),
('CZ', 'Czech Republic', 'Czech Republic', 'République tchèque', 'Eastern Europe', false),
('GR', 'Greece', 'Greece', 'Grèce', 'Southern Europe', false),
('RO', 'Romania', 'Romania', 'Roumanie', 'Eastern Europe', false),
('HU', 'Hungary', 'Hungary', 'Hongrie', 'Eastern Europe', false)
ON CONFLICT (code) DO NOTHING;

-- Note: Only FR, DE, GB are active by default (have testers)
-- Others show "Coming Soon" until activated by admin
