#!/bin/bash

# Script pour exécuter la migration complète
# Usage: ./run_complete_migration.sh

set -e  # Arrêter en cas d'erreur

echo "🚀 Démarrage de la migration complète..."
echo "📋 Contenu: Messaging + ChatOrders + KYC Stripe Identity"
echo ""

# Charger les variables d'environnement de manière sécurisée
if [ -f .env ]; then
    set -a  # Exporter automatiquement les variables
    source .env
    set +a
fi

# Vérifier que DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL n'est pas défini dans .env"
    exit 1
fi

echo "🔗 Connexion à la base de données..."
echo ""

# Exécuter la migration
psql "$DATABASE_URL" -f scripts/migrations/complete_migration.sql

echo ""
echo "✅ Migration terminée avec succès!"
echo ""
echo "📝 Étape suivante: npx prisma generate"
echo ""

# Générer les types Prisma
npx prisma generate

echo ""
echo "🎉 Tout est prêt ! Le serveur va redémarrer automatiquement."
