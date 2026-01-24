# Migrations SQL - Super Try API

Ce dossier contient toutes les migrations SQL manuelles pour la base de données.

## Ordre d'exécution recommandé

Les migrations doivent être exécutées dans l'ordre suivant :

### 1. Migrations de base
```bash
# Migration initiale (si nécessaire)
psql "..." < prisma/migrations/manual-migration.sql

# Schéma de base
psql "..." < prisma/migrations/migration_simple.sql
```

### 2. Stripe & Paiements
```bash
psql "..." < prisma/migrations/add_stripe_ids.sql
psql "..." < prisma/migrations/add_stripe_fields.sql
```

### 3. Messagerie
```bash
psql "..." < prisma/migrations/enhance_messaging.sql
```

### 4. Templates & Critères
```bash
psql "..." < prisma/migrations/add_criteria_templates.sql
```

### 5. Auth & Utilisateurs
```bash
psql "..." < prisma/migrations/make_role_nullable.sql
psql "..." < prisma/migrations/add_auth_provider_and_is_onboarded.sql
```

### 6. Marketplace & Catégories
```bash
psql "..." < prisma/migrations/add_amazon_marketplace.sql
psql "..." < prisma/migrations/add_category_to_campaigns.sql
```

### 7. Produits & Offres (NOUVELLES - 2026-01-24)
```bash
# Ajouter le nom du produit dans les offres
psql "..." < prisma/migrations/add_product_name_to_offers.sql

# Système de validation du prix avec tentatives
psql "..." < prisma/migrations/add_price_validation_attempts.sql
```

## Commande complète

Remplacez `"..."` par votre chaîne de connexion :

```bash
export DB_URL="postgresql://postgres.mdihnqriahzlqtrjexuy:1234@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

# Exécuter toutes les migrations dans l'ordre
psql "$DB_URL" < prisma/migrations/add_stripe_ids.sql
psql "$DB_URL" < prisma/migrations/add_stripe_fields.sql
psql "$DB_URL" < prisma/migrations/enhance_messaging.sql
psql "$DB_URL" < prisma/migrations/add_criteria_templates.sql
psql "$DB_URL" < prisma/migrations/make_role_nullable.sql
psql "$DB_URL" < prisma/migrations/add_auth_provider_and_is_onboarded.sql
psql "$DB_URL" < prisma/migrations/add_amazon_marketplace.sql
psql "$DB_URL" < prisma/migrations/add_category_to_campaigns.sql
psql "$DB_URL" < prisma/migrations/add_product_name_to_offers.sql
psql "$DB_URL" < prisma/migrations/add_price_validation_attempts.sql
```

## Vérification

Après exécution, vérifiez que les migrations ont bien été appliquées :

```bash
psql "$DB_URL" -c "\d offers"
psql "$DB_URL" -c "\d sessions"
psql "$DB_URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'product_name';"
psql "$DB_URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sessions' AND column_name IN ('price_validation_attempts', 'product_title_submitted');"
```

## Notes importantes

- ⚠️ **Toujours faire un backup avant d'exécuter des migrations**
- Les migrations sont idempotentes (peuvent être exécutées plusieurs fois sans erreur grâce à `IF NOT EXISTS`)
- Les nouvelles migrations (24/01/2026) incluent la migration des données existantes
- Pour annuler une migration, utilisez les commandes SQL inverses appropriées

## Dernières modifications

- **24/01/2026** : Ajout du nom du produit dans les offres + système de validation du prix avec tentatives
- **23/01/2026** : Ajout des catégories et marketplace Amazon
- **22/01/2026** : Auth provider et onboarding
