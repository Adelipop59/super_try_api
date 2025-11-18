-- Add category_id column to products table if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID;

-- Add foreign key constraint
ALTER TABLE products
ADD CONSTRAINT products_category_id_fkey
FOREIGN KEY (category_id)
REFERENCES categories(id)
ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
