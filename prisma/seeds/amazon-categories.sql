-- Script de seed pour les catégories Amazon
-- Basé sur la structure de catégories Amazon fournie par l'utilisateur
-- Exécuter avec : psql $DATABASE_URL -f prisma/seeds/amazon-categories.sql

BEGIN;

INSERT INTO categories (id, name, slug, description, icon, is_active, created_at, updated_at) VALUES
  -- Electronics & Computers
  (gen_random_uuid(), 'Electronics & Computers', 'electronics-computers', 'Appareils électroniques et informatiques', '📱', true, NOW(), NOW()),
  (gen_random_uuid(), 'Cell Phones & Accessories', 'cell-phones', 'Téléphones et accessoires', '📱', true, NOW(), NOW()),
  (gen_random_uuid(), 'Camera & Photo', 'camera-photo', 'Appareils photo et vidéo', '📷', true, NOW(), NOW()),
  (gen_random_uuid(), 'Personal Computers', 'computers', 'Ordinateurs et périphériques', '💻', true, NOW(), NOW()),
  (gen_random_uuid(), 'Consumer Electronics', 'consumer-electronics', 'Électronique grand public', '🖥️', true, NOW(), NOW()),
  (gen_random_uuid(), 'Amazon Device Accessories', 'amazon-devices', 'Accessoires pour appareils Amazon', '🔌', true, NOW(), NOW()),
  (gen_random_uuid(), 'Amazon Kindle & Accessories', 'kindle', 'Kindle et accessoires', '📖', true, NOW(), NOW()),
  (gen_random_uuid(), 'Amazon Fire TV Accessories', 'fire-tv', 'Accessoires Fire TV', '📺', true, NOW(), NOW()),

  -- Home & Lifestyle
  (gen_random_uuid(), 'Home & Lifestyle', 'home-lifestyle', 'Maison et style de vie', '🏠', true, NOW(), NOW()),
  (gen_random_uuid(), 'Home & Garden', 'home-garden', 'Maison et jardin', '🌿', true, NOW(), NOW()),
  (gen_random_uuid(), 'Major Appliances', 'appliances', 'Électroménager', '🔌', true, NOW(), NOW()),
  (gen_random_uuid(), 'Tools & Home Improvement', 'tools', 'Outils et bricolage', '🔧', true, NOW(), NOW()),
  (gen_random_uuid(), 'Office Products', 'office', 'Fournitures de bureau', '📎', true, NOW(), NOW()),

  -- Fashion & Beauty
  (gen_random_uuid(), 'Fashion & Beauty', 'fashion-beauty', 'Mode et beauté', '👗', true, NOW(), NOW()),
  (gen_random_uuid(), 'Clothing', 'clothing', 'Vêtements', '👕', true, NOW(), NOW()),
  (gen_random_uuid(), 'Shoes & Handbags', 'shoes-handbags', 'Chaussures et sacs', '👜', true, NOW(), NOW()),
  (gen_random_uuid(), 'Jewellery', 'jewellery', 'Bijoux', '💍', true, NOW(), NOW()),
  (gen_random_uuid(), 'Watches', 'watches', 'Montres', '⌚', true, NOW(), NOW()),
  (gen_random_uuid(), 'Beauty', 'beauty', 'Beauté et cosmétiques', '💄', true, NOW(), NOW()),

  -- Entertainment & Media
  (gen_random_uuid(), 'Entertainment & Media', 'entertainment', 'Divertissement et médias', '🎬', true, NOW(), NOW()),
  (gen_random_uuid(), 'Books', 'books', 'Livres', '📚', true, NOW(), NOW()),
  (gen_random_uuid(), 'Music', 'music', 'Musique', '🎵', true, NOW(), NOW()),
  (gen_random_uuid(), 'Musical Instruments', 'instruments', 'Instruments de musique', '🎸', true, NOW(), NOW()),
  (gen_random_uuid(), 'Video Games', 'video-games', 'Jeux vidéo', '🎮', true, NOW(), NOW()),
  (gen_random_uuid(), 'Toys & Games', 'toys', 'Jouets et jeux', '🧸', true, NOW(), NOW()),

  -- Sports & Outdoors
  (gen_random_uuid(), 'Sports & Outdoors', 'sports-outdoors', 'Sport et plein air', '⚽', true, NOW(), NOW()),
  (gen_random_uuid(), 'Sports', 'sports', 'Articles de sport', '🏀', true, NOW(), NOW()),
  (gen_random_uuid(), 'Sports Collectibles', 'sports-collectibles', 'Objets de collection sportifs', '🏆', true, NOW(), NOW()),
  (gen_random_uuid(), 'Outdoors', 'outdoors', 'Activités extérieures', '🏕️', true, NOW(), NOW()),

  -- Specialty & Collectibles
  (gen_random_uuid(), 'Specialty & Collectibles', 'specialty', 'Spécialités et objets de collection', '🎨', true, NOW(), NOW()),
  (gen_random_uuid(), 'Collectible Coins', 'coins', 'Pièces de collection', '🪙', true, NOW(), NOW()),
  (gen_random_uuid(), 'Entertainment Collectibles', 'collectibles', 'Objets de collection divertissement', '🎭', true, NOW(), NOW()),
  (gen_random_uuid(), 'Fine Art', 'fine-art', 'Beaux-arts', '🖼️', true, NOW(), NOW()),
  (gen_random_uuid(), 'Independent Design', 'independent-design', 'Design indépendant', '✨', true, NOW(), NOW()),

  -- Food & Care
  (gen_random_uuid(), 'Food & Care', 'food-care', 'Alimentation et soins', '🍎', true, NOW(), NOW()),
  (gen_random_uuid(), 'Grocery & Gourmet Food', 'grocery', 'Épicerie et gastronomie', '🛒', true, NOW(), NOW()),
  (gen_random_uuid(), 'Health & Personal Care', 'health', 'Santé et soins personnels', '💊', true, NOW(), NOW()),
  (gen_random_uuid(), 'Baby Products', 'baby', 'Produits pour bébés', '🍼', true, NOW(), NOW()),
  (gen_random_uuid(), 'Pet Supplies', 'pets', 'Fournitures pour animaux', '🐾', true, NOW(), NOW()),

  -- Other
  (gen_random_uuid(), 'Other', 'other', 'Autres catégories', '📦', true, NOW(), NOW()),
  (gen_random_uuid(), 'Software', 'software', 'Logiciels', '💿', true, NOW(), NOW()),
  (gen_random_uuid(), 'Industrial & Scientific', 'industrial', 'Industriel et scientifique', '🔬', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- Vérification
SELECT COUNT(*) as total_categories FROM categories;
SELECT name, slug, icon FROM categories ORDER BY name LIMIT 10;
