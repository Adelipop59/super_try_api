-- Remove existing category_id column if it exists (wrong type)
ALTER TABLE products DROP COLUMN IF EXISTS category_id;

-- Add category_id column with correct UUID type
ALTER TABLE products ADD COLUMN category_id UUID;

-- Add foreign key constraint
ALTER TABLE products
ADD CONSTRAINT products_category_id_fkey
FOREIGN KEY (category_id)
REFERENCES categories(id)
ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
