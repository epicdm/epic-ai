# Scripts Directory

Diagnostic and utility scripts for Epic AI.

## Available Scripts

### `check-db-schema.ts`

**Purpose**: Diagnose database schema issues, particularly for the memberships table.

**Use Case**: Run this if Facebook Quick Setup is failing with column name errors.

**How to Run**:

```bash
# Prerequisites:
# 1. Set DATABASE_URL environment variable (production database)
# 2. Be in the project root directory

# Install tsx if not already installed
pnpm install -g tsx

# Run the script
export DATABASE_URL="postgresql://user:password@host:port/database"
npx tsx scripts/check-db-schema.ts
```

**What It Does**:
1. Counts memberships in database
2. Fetches a sample membership
3. Queries `information_schema` to get actual column names
4. Identifies whether database uses camelCase or snake_case
5. Recommends which pattern to use in `createOrganization()`

**Expected Output**:

```
🔍 Checking Database Schema...

Test 1: Querying memberships table...
✅ Found 5 memberships in database

Test 2: Fetching sample membership...
✅ Sample membership retrieved:
{
  "id": "mem_xxxxx",
  "userId": "user_xxxxx",
  "organizationId": "org_xxxxx",
  "role": "owner",
  "created_at": "2025-01-13T10:00:00.000Z",
  "updated_at": "2025-01-13T10:00:00.000Z"
}

Test 3: Checking actual column names in memberships table...
✅ Memberships table columns:
┌─────────┬─────────────────────┬─────────────┬──────────────┐
│ (index) │ column_name         │ data_type   │ is_nullable  │
├─────────┼─────────────────────┼─────────────┼──────────────┤
│    0    │ 'id'                │ 'uuid'      │ 'NO'         │
│    1    │ 'user_id'           │ 'uuid'      │ 'NO'         │
│    2    │ 'organization_id'   │ 'uuid'      │ 'NO'         │
│    3    │ 'role'              │ 'text'      │ 'NO'         │
│    4    │ 'created_at'        │ 'timestamp' │ 'NO'         │
│    5    │ 'updated_at'        │ 'timestamp' │ 'NO'         │
└─────────┴─────────────────────┴─────────────┴──────────────┘

Test 4: Identifying column naming pattern...
Column name patterns:
  - "userId" (camelCase): ❌ NOT FOUND
  - "user_id" (snake_case): ✅ FOUND
  - "organizationId" (camelCase): ❌ NOT FOUND
  - "organization_id" (snake_case): ✅ FOUND

Test 5: Recommendation for createOrganization() fix...
✅ RECOMMENDATION: Use snake_case pattern (Pattern 3)
   The database uses snake_case columns (user_id, organization_id)
   This means Prisma @map directive should work correctly.

✅ Database schema check complete!
```

---

## Troubleshooting

### Error: "Environment variable not found: DATABASE_URL"

**Solution**: Export the DATABASE_URL before running the script:

```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
```

Or create a `.env` file in the project root:

```
DATABASE_URL="postgresql://user:password@host:port/database"
```

### Error: "Can't reach database server"

**Possible Causes**:
1. DATABASE_URL is incorrect
2. Database is not accessible from your machine (firewall/VPN)
3. Database is on DigitalOcean and requires trusted sources

**Solution**:
- Verify DATABASE_URL is correct
- Check DigitalOcean firewall settings
- Run from a trusted source or add your IP to trusted sources

---

## When to Use This Script

1. **Facebook Quick Setup Failing**: When you see database column errors
2. **After Database Migration**: To verify schema matches Prisma
3. **Before Deploying Fixes**: To understand actual database structure
4. **Debugging Membership Creation**: To identify correct column pattern

---

## Related Documentation

- `DATABASE_SYNC_REQUIRED.md` - Instructions for syncing database schema
- `TESTING_REQUIRED.md` - Testing guide for Facebook Quick Setup
- `CURRENT_STATUS.md` - Current status of all fixes
