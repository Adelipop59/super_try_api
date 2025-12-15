#!/bin/bash

set -e

echo "🚀 Exécution de la migration SQL..."

# Utiliser la DATABASE_URL depuis l'environnement (déjà chargé par dotenv ou manuellement)
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL n'est pas défini"
    echo "💡 Utilisez: export DATABASE_URL='votre_url' puis relancez"
    exit 1
fi

echo "🔗 Connexion à la base de données..."
psql "$DATABASE_URL" -f scripts/migrations/complete_migration.sql

echo ""
echo "✅ Migration SQL terminée avec succès!"
echo "📝 Les types Prisma ont déjà été générés."
echo "🎉 C'est prêt !"
