-- Drop foreign key if exists
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_id_fkey;

-- Drop category_id column
ALTER TABLE products DROP COLUMN IF EXISTS category_id;

-- Recreate categories table with UUID
DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX categories_slug_idx ON categories(slug);
CREATE INDEX categories_is_active_idx ON categories(is_active);

-- Add category_id to products with UUID type
ALTER TABLE products ADD COLUMN category_id UUID;

-- Add foreign key constraint
ALTER TABLE products
ADD CONSTRAINT products_category_id_fkey
FOREIGN KEY (category_id)
REFERENCES categories(id)
ON DELETE SET NULL;

-- Add index
CREATE INDEX idx_products_category_id ON products(category_id);
