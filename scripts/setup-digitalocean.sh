#!/bin/bash
# ===========================================
# Epic AI - DigitalOcean Setup Script
# ===========================================
# Prerequisites:
# - doctl CLI installed and authenticated
# - DigitalOcean account with API token
# ===========================================

set -e

# Configuration
PROJECT_NAME="epic-ai"
REGION="nyc1"
SPACES_REGION="nyc3"

echo "🚀 Setting up DigitalOcean infrastructure for Epic AI..."

# ===========================================
# 1. Create Managed PostgreSQL Database
# ===========================================
echo "📦 Creating Managed PostgreSQL database..."
doctl databases create ${PROJECT_NAME}-db \
  --engine pg \
  --version 16 \
  --size db-s-1vcpu-1gb \
  --region ${REGION} \
  --num-nodes 1 \
  --wait

# Get database connection info
DB_ID=$(doctl databases list --format ID --no-header | head -1)
echo "✅ Database created: ${DB_ID}"

# Create the epic_ai database
doctl databases db create ${DB_ID} epic_ai

# ===========================================
# 2. Create Managed Redis
# ===========================================
echo "📦 Creating Managed Redis cache..."
doctl databases create ${PROJECT_NAME}-redis \
  --engine redis \
  --version 7 \
  --size db-s-1vcpu-1gb \
  --region ${REGION} \
  --num-nodes 1 \
  --wait

REDIS_ID=$(doctl databases list --engine redis --format ID --no-header | head -1)
echo "✅ Redis created: ${REDIS_ID}"

# ===========================================
# 3. Create Spaces Bucket (S3-compatible)
# ===========================================
echo "📦 Creating Spaces bucket for media storage..."
doctl spaces create ${PROJECT_NAME}-media \
  --region ${SPACES_REGION}

# Enable CDN for the bucket
echo "🌐 Note: Enable CDN manually in DO console for ${PROJECT_NAME}-media bucket"

# ===========================================
# 4. Create Spaces Access Keys
# ===========================================
echo "🔑 Creating Spaces access keys..."
# Note: This requires manual creation in DO console
echo "⚠️  Create Spaces access keys manually in DO console:"
echo "   1. Go to API > Spaces Keys"
echo "   2. Generate Access Keys"
echo "   3. Save the Key and Secret"

# ===========================================
# 5. Get Connection Strings
# ===========================================
echo ""
echo "===========================================
echo "📋 Connection Information"
echo "==========================================="

echo ""
echo "PostgreSQL Connection String:"
doctl databases connection ${DB_ID} --format URI --no-header

echo ""
echo "Redis Connection String:"
doctl databases connection ${REDIS_ID} --format URI --no-header

echo ""
echo "Spaces Configuration:"
echo "  Bucket: ${PROJECT_NAME}-media"
echo "  Region: ${SPACES_REGION}"
echo "  Endpoint: https://${SPACES_REGION}.digitaloceanspaces.com"
echo "  CDN: https://${PROJECT_NAME}-media.${SPACES_REGION}.cdn.digitaloceanspaces.com"

# ===========================================
# 6. Output Vercel Environment Variables
# ===========================================
echo ""
echo "==========================================="
echo "📋 Vercel Environment Variables"
echo "==========================================="
echo ""
echo "Copy these to your Vercel project settings:"
echo ""

DB_URL=$(doctl databases connection ${DB_ID} --format URI --no-header)
REDIS_URL=$(doctl databases connection ${REDIS_ID} --format URI --no-header)

echo "DATABASE_URL=${DB_URL}"
echo "REDIS_URL=${REDIS_URL}"
echo "DO_SPACES_BUCKET=${PROJECT_NAME}-media"
echo "DO_SPACES_REGION=${SPACES_REGION}"
echo "DO_SPACES_ENDPOINT=https://${SPACES_REGION}.digitaloceanspaces.com"
echo "DO_SPACES_CDN_ENDPOINT=https://${PROJECT_NAME}-media.${SPACES_REGION}.cdn.digitaloceanspaces.com"
echo ""
echo "⚠️  Don't forget to add:"
echo "  - DO_SPACES_KEY (from console)"
echo "  - DO_SPACES_SECRET (from console)"

echo ""
echo "✅ DigitalOcean setup complete!"
echo ""
echo "Next steps:"
echo "  1. Add environment variables to Vercel"
echo "  2. Run: pnpm db:push (to create tables)"
echo "  3. Deploy to Vercel"
