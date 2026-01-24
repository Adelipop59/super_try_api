# Super Try - Backend API

API NestJS pour la plateforme Super Try.

## 🚀 Démarrage

```bash
# Installer les dépendances
npm install

# Générer le client Prisma
npx prisma generate

# Lancer en développement
npm run start:dev

# Build production
npm run build

# Lancer en production
npm run start:prod
```

## 📁 Structure

Voir [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) pour la structure complète.

## ⚙️ Configuration

Créez un fichier `.env` avec :

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
STRIPE_SECRET_KEY=...
JWT_SECRET=...
```

## 🗃️ Base de données

### Migrations

Voir [prisma/migrations/README.md](./prisma/migrations/README.md) pour exécuter les migrations.

### Dernières migrations (24/01/2026)

```bash
export DB_URL="postgresql://..."

# 1. Nom du produit dans les offres
psql "$DB_URL" < prisma/migrations/add_product_name_to_offers.sql

# 2. Validation du prix avec tentatives
psql "$DB_URL" < prisma/migrations/add_price_validation_attempts.sql
```

## 🔗 Frontend

Le frontend se trouve dans `/Users/adelblk/Desktop/envDev/super_try_app`

## 🛠️ Technologies

- NestJS
- Prisma ORM
- PostgreSQL (Supabase)
- Stripe
- TypeScript

## 📝 API Documentation

L'API Swagger est disponible sur : `http://localhost:3000/api/docs`
