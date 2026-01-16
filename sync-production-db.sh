#!/bin/bash
# Sync Production Database Schema
# This script pushes the Prisma schema to your production database

echo "🔧 Syncing Production Database Schema..."
echo ""
echo "⚠️  Make sure you have set DATABASE_URL to your PRODUCTION database!"
echo ""
echo "Current DATABASE_URL: $DATABASE_URL"
echo ""
read -p "Is this your PRODUCTION database? (y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "❌ Aborted. Please set DATABASE_URL to production first:"
    echo ""
    echo "export DATABASE_URL='postgresql://user:pass@db-postgresql-nyc1-47698.b.db.ondigitalocean.com:25060/defaultdb?sslmode=require'"
    exit 1
fi

echo ""
echo "📦 Installing dependencies..."
cd packages/database
pnpm install

echo ""
echo "🚀 Pushing schema to production database..."
npx prisma db push --skip-generate

echo ""
echo "✅ Database schema synced!"
echo ""
echo "Next steps:"
echo "1. Test Facebook connect at https://leads.epic.dm"
echo "2. Check console logs - should NOT see fallback SQL errors"
