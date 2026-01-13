# 🔥 URGENT: Database Schema Out of Sync

## Problem
The Facebook Quick Setup is failing because your **database schema is out of sync** with the Prisma schema. Specifically, the `memberships` table's column mapping is outdated.

### Error Message:
```
Invalid `prisma.membership.create()` invocation:
Foreign key constraint failed on the field: `userId`
The column `user_id` does not exist in the current database.
```

---

## Solution Applied (Aggressive Workaround)

I've added an **aggressive fallback mechanism** in `apps/web/src/lib/services/organization.ts` that:
1. **ALWAYS** creates organization and membership separately (no nested create)
2. Tries to create membership with Prisma (mapped columns)
3. If that fails, tries raw SQL with camelCase columns (`userId`, `organizationId`)
4. If that fails, tries raw SQL with snake_case columns (`user_id`, `organization_id`)
5. Cleans up orphaned organization if all attempts fail

**This is a temporary fix** - you still need to sync your database properly.

**Latest Update**: Deployed commit `d0cd27f` with raw SQL fallbacks (lines 39-96)

---

## ✅ How to Fix (Production Database)

### Option 1: Via DigitalOcean Console (Recommended)
Since your database is on DigitalOcean, you need to run the migration there:

1. **SSH into your DigitalOcean app**:
   ```bash
   doctl apps logs <your-app-id> --follow
   ```

2. **Or use the DigitalOcean Console**:
   - Go to your App Platform app
   - Click "Console" tab
   - Run: `cd packages/database && npx prisma db push`

### Option 2: Run Locally with Production DATABASE_URL

If you have the production `DATABASE_URL`:

```bash
# Set the DATABASE_URL environment variable
export DATABASE_URL="postgresql://user:password@host:port/database"

# Push the schema to the database
cd packages/database
npx prisma db push

# Or generate and run a migration
npx prisma migrate dev --name sync_membership_columns
```

### Option 3: Quick Fix Script

Create a file `sync-db.sh`:

```bash
#!/bin/bash
# Load environment variables from .env.local
export $(grep -v '^#' apps/web/.env.local | xargs)

# Push Prisma schema to database
cd packages/database
npx prisma db push

echo "✅ Database schema synced!"
```

Then run:
```bash
chmod +x sync-db.sh
./sync-db.sh
```

---

## 🔍 What Went Wrong?

The Prisma schema (packages/database/prisma/schema.prisma) defines:

```prisma
model Membership {
  id             String   @id @default(cuid())
  userId         String   @map("user_id")      // ← Maps to user_id column
  organizationId String   @map("organization_id") // ← Maps to organization_id column
  // ...
}
```

But your database table `memberships` doesn't have the `user_id` and `organization_id` columns, or they have different names.

---

## ⚠️ Impact

### What's Working (with workaround):
- ✅ Organization creation
- ✅ Membership creation (via fallback)
- ✅ Facebook Quick Setup should now work

### What Needs Attention:
- ⚠️ Database schema needs proper sync
- ⚠️ All Prisma operations are at risk of similar failures
- ⚠️ Performance impact from fallback logic

---

## 🧪 Testing After Fix

Once you sync the database, test:

1. **Facebook Quick Setup**:
   - Go to `/onboarding`
   - Click "Connect with Facebook"
   - Should create org/brand and auto-fill form

2. **Voice Agents**:
   - Go to `/dashboard/voice`
   - Should see all your agents

3. **Check Console Logs**:
   - Should NOT see `[createOrganization] Failed to create with nested membership:` error
   - Should see normal organization creation flow

---

## 📝 Files Modified

- ✅ `apps/web/src/lib/services/organization.ts` - Added fallback logic for membership creation

---

## Next Steps

1. **Immediate**: The workaround allows Facebook Quick Setup to work
2. **Soon**: Sync your production database schema using one of the options above
3. **Verify**: Test that all operations work without triggering fallback logic

---

## Need Help?

If you can't access the production database to run migrations, you may need to:
1. Add a database migration step to your DigitalOcean App Platform deployment
2. Or run migrations manually through DigitalOcean's console

The key is ensuring `npx prisma db push` runs against your production database.
