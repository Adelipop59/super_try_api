#!/bin/bash

# Script pour appliquer la migration Stripe manuellement
# Usage: ./apply_stripe_migration.sh

set -e  # Exit on error

echo "🔧 Application de la migration Stripe..."
echo ""

# Charger les variables d'environnement (méthode compatible avec guillemets)
if [ -f .env ]; then
    set -a
    source .env
    set +a
    echo "✅ Variables d'environnement chargées depuis .env"
else
    echo "❌ Fichier .env non trouvé"
    exit 1
fi

# Vérifier que DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL n'est pas défini dans .env"
    exit 1
fi

echo "📊 Base de données: $(echo $DATABASE_URL | sed 's/:\/\/.*@/: \/\/***@/')"
echo ""

# Extraire l'URL directe (sans pooler) pour psql
# Supabase pooler: aws-1-eu-north-1.pooler.supabase.com:6543
# Supabase direct: aws-1-eu-north-1.aws.supabase.com:5432
DIRECT_URL=$(echo $DATABASE_URL | sed 's/pooler\.supabase\.com:6543/aws.supabase.com:5432/')

echo "🚀 Exécution de la migration SQL..."
echo ""

# Option 1: Avec psql (recommandé)
if command -v psql &> /dev/null; then
    psql "$DIRECT_URL" -f add_stripe_fields.sql
    echo ""
    echo "✅ Migration appliquée avec succès via psql!"
else
    # Option 2: Avec Prisma (fallback)
    echo "⚠️  psql non trouvé, utilisation de Prisma..."
    npx prisma db execute --file add_stripe_fields.sql --schema prisma/schema.prisma
    echo "✅ Migration appliquée avec succès via Prisma!"
fi

echo ""
echo "🔄 Génération du client Prisma..."
npx prisma generate

echo ""
echo "✅ Migration terminée!"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Vérifier que les colonnes existent dans la base"
echo "   2. Redémarrer le serveur (npm run start:dev)"
echo "   3. Tester la création de Stripe Customer/Account"
