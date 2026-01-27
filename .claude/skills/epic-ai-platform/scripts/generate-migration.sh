#!/bin/bash
# Generate a new Prisma migration

if [ -z "$1" ]; then
  echo "Usage: ./generate-migration.sh <migration-name>"
  echo "Example: ./generate-migration.sh add_video_support"
  exit 1
fi

MIGRATION_NAME=$1

echo "📦 Generating Prisma migration: $MIGRATION_NAME"
echo ""

# Navigate to database package
cd packages/database || exit 1

# Generate migration
pnpm prisma migrate dev --name "$MIGRATION_NAME"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration created successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Review the migration in packages/database/prisma/migrations/"
  echo "2. Test locally: pnpm --filter @epic-ai/database migrate dev"
  echo "3. Deploy to production: pnpm --filter @epic-ai/database migrate deploy"
else
  echo ""
  echo "❌ Migration generation failed"
  exit 1
fi
