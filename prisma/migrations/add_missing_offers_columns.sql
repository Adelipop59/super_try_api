-- Add missing columns to offers table if they don't exist

-- expected_price
ALTER TABLE offers ADD COLUMN IF NOT EXISTS expected_price DECIMAL(10, 2);

-- shipping_cost
ALTER TABLE offers ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10, 2) DEFAULT 0;

-- price_range_min
ALTER TABLE offers ADD COLUMN IF NOT EXISTS price_range_min DECIMAL(10, 2);

-- price_range_max
ALTER TABLE offers ADD COLUMN IF NOT EXISTS price_range_max DECIMAL(10, 2);

-- is_price_revealed
ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_price_revealed BOOLEAN DEFAULT false;

-- reimbursed_price
ALTER TABLE offers ADD COLUMN IF NOT EXISTS reimbursed_price BOOLEAN DEFAULT true;

-- reimbursed_shipping
ALTER TABLE offers ADD COLUMN IF NOT EXISTS reimbursed_shipping BOOLEAN DEFAULT true;

-- max_reimbursed_price
ALTER TABLE offers ADD COLUMN IF NOT EXISTS max_reimbursed_price DECIMAL(10, 2);

-- max_reimbursed_shipping
ALTER TABLE offers ADD COLUMN IF NOT EXISTS max_reimbursed_shipping DECIMAL(10, 2);

-- bonus
ALTER TABLE offers ADD COLUMN IF NOT EXISTS bonus DECIMAL(10, 2);

-- quantity
ALTER TABLE offers ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
