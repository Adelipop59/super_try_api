#!/bin/bash

# Script de diagnostic des sessions KYC
# Usage: ./scripts/check-kyc.sh

echo "🔍 Diagnostic des sessions KYC..."
echo ""

# Connection string
DB_URL="postgresql://postgres.mdihnqriahzlqtrjexuy:1234@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

# Exécuter le diagnostic SQL
psql "$DB_URL" -f "$(dirname "$0")/check-kyc-sessions.sql"

echo ""
echo "✅ Diagnostic terminé"
