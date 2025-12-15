#!/bin/bash

# Super Try API - Migrations Runner
# Execute all pending migrations

DB_URL="postgresql://postgres.mdihnqriahzlqtrjexuy:1234@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

echo "🚀 Running Super Try API migrations..."
echo ""

echo "1️⃣  Migration: Messaging Enhancements..."
psql "$DB_URL" < scripts/migrations/add_messaging_enhancements.sql
if [ $? -eq 0 ]; then
    echo "✅ Messaging enhancements applied"
else
    echo "❌ Messaging enhancements failed"
    exit 1
fi
echo ""

echo "2️⃣  Migration: ChatOrders System..."
psql "$DB_URL" < scripts/migrations/add_chat_orders.sql
if [ $? -eq 0 ]; then
    echo "✅ ChatOrders system applied"
else
    echo "❌ ChatOrders system failed"
    exit 1
fi
echo ""

echo "3️⃣  Migration: KYC Stripe Identity..."
psql "$DB_URL" < scripts/migrations/add_kyc_fields.sql
if [ $? -eq 0 ]; then
    echo "✅ KYC fields applied"
else
    echo "❌ KYC fields failed"
    exit 1
fi
echo ""

echo "🔄 Regenerating Prisma Client..."
npx prisma generate
if [ $? -eq 0 ]; then
    echo "✅ Prisma Client regenerated"
else
    echo "❌ Prisma generate failed"
    exit 1
fi
echo ""

echo "✨ All migrations completed successfully!"
